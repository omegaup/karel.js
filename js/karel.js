if (typeof Event === 'undefined') {
	var Event = function(type) {
		this.type = type;
	};
}

/**
 * A class that implements the W3C DOM's EventTarget interface.
 * http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget
 */
var EventTarget = function() {
	var self = this;
	self.listeners = {};
};

EventTarget.prototype.addEventListener = function(type, listener) {
	var self = this;
	if (!self.listeners.hasOwnProperty(type)) {
		self.listeners[type] = [];
	}
	self.listeners[type].push(listener);
};

EventTarget.prototype.removeEventListener = function(type, listener) {
	var self = this;
	if (self.listeners.hasOwnProperty(type)) {
		var index = self.listeners[type].indexOf(listener);
		if (index > -1) {
			self.listeners[type].splice(index, 1);
		}
	}
};

EventTarget.prototype.dispatchEvent = function(evt) {
	var self = this;
	if (self.listeners.hasOwnProperty(evt._type)) {
		for (var i = 0; i < self.listeners[evt._type].length; i++) {
			self.listeners[evt._type][i](evt);
		}
	}
};

EventTarget.prototype.fireEvent = function(type, properties) {
	var self = this;

	var evt = null;

	// IE<11 does not support the construction of custom events through
	// standard means. ugh.
	if (typeof document != 'undefined' && document.createEvent) {
		evt = document.createEvent('Event');
	} else if (typeof document != 'undefined' && document.createEventObject) {
		evt = document.createEventObject();
	} else {
		evt = new Event(type);
	}

	if (properties) {
		for (var p in properties) {
			if (properties.hasOwnProperty(p)) {
				evt[p] = properties[p];
			}
		}
		evt.runtime = properties.target;
	}

	evt._type = type;

	self.dispatchEvent(evt);
};

/**
 * A class that holds the state of computation and executes opcodes.
 *
 * The Karel Virtual Machine is a simple, stack-based virtual machine with
 * a small number of opcodes, based loosely on the Java Virtual Machine.
 * All opcodes are represented as an array where the first element is the
 * opcode name, followed by zero or one parameters.
 */
var Runtime = function(world) {
	var self = this;

	self.debug = false;
	self.world = world;
	self.disableStackEvents = false;

	self.load([['HALT']]);
};

Runtime.prototype = new EventTarget();

Runtime.HALT = 0;
Runtime.LINE = 1;
Runtime.LEFT = 2;
Runtime.WORLDWALLS = 3;
Runtime.ORIENTATION = 4;
Runtime.ROTL = 5;
Runtime.ROTR = 6;
Runtime.MASK = 7;
Runtime.NOT = 8;
Runtime.AND = 9;
Runtime.OR = 10;
Runtime.EQ = 11;
Runtime.EZ = 12;
Runtime.JZ = 13;
Runtime.JMP = 14;
Runtime.FORWARD = 15;
Runtime.WORLDBUZZERS = 16;
Runtime.BAGBUZZERS = 17;
Runtime.PICKBUZZER = 18;
Runtime.LEAVEBUZZER = 19;
Runtime.LOAD = 20;
Runtime.POP = 21;
Runtime.DUP = 22;
Runtime.DEC = 23;
Runtime.INC = 24;
Runtime.CALL = 25;
Runtime.RET = 26;
Runtime.PARAM = 27;

Runtime.prototype.load = function(opcodes) {
	var self = this;
	var opcode_mapping = ['HALT', 'LINE', 'LEFT', 'WORLDWALLS', 'ORIENTATION',
			'ROTL', 'ROTR', 'MASK', 'NOT', 'AND', 'OR', 'EQ', 'EZ', 'JZ', 'JMP',
			'FORWARD', 'WORLDBUZZERS', 'BAGBUZZERS', 'PICKBUZZER', 'LEAVEBUZZER',
			'LOAD', 'POP', 'DUP', 'DEC', 'INC', 'CALL', 'RET', 'PARAM'];
	var error_mapping = ['WALL', 'WORLDUNDERFLOW', 'BAGUNDERFLOW'];

	self.raw_opcodes = opcodes;
	var function_map = {};
	self.function_names = [];
	var function_idx = 0;
	self.program = new Int16Array(new ArrayBuffer(opcodes.length * 6));
	for (var i = 0; i < opcodes.length; i++) {
		self.program[3*i] = opcode_mapping.indexOf(opcodes[i][0]);
		if (opcodes[i].length > 1) {
			self.program[3*i+1] = opcodes[i][1];
		}
		if (opcodes[i][0] == 'CALL') {
			if (!function_map.hasOwnProperty(opcodes[i][2])) {
				function_map[opcodes[i][2]] = function_idx;
				self.function_names[function_idx++] = opcodes[i][2];
			}
			self.program[3*i+2] = function_map[opcodes[i][2]];
		} else if(opcodes[i][0] == 'EZ') {
			self.program[3*i+1] = error_mapping.indexOf(opcodes[i][1]);
			if (self.program[3*i+1] == -1) {
				throw new Error('Invalid error: ' + opcodes[i][1]);
			}
		}
	}
	self.reset();
};

Runtime.prototype.start = function() {
	var self = this;
	self.fireEvent('start', { target: self, world: self.world });
};

Runtime.prototype.reset = function() {
	var self = this;

	self.state = {
		pc: 0,
		sp: -1,
		fp: -1,
		line: 0,
		ic: 0,
		stack: new Int32Array(new ArrayBuffer(0xffff * 16 + 40)),
		stackSize: 0,

		// Flags
		jumped: false,
		running: true
	};

	if (self.debug) {
		self.fireEvent('debug', {
			target: self,
			message: JSON.stringify(self.raw_opcodes),
			debugType: 'program'
		});
	}
};

Runtime.prototype.step = function() {
	var self = this;

	while (self.state.running) {
		try {
			self.next();

			if (self.state.running && self.program[3*self.state.pc] == Runtime.LINE) {
				self.state.line = self.program[3*self.state.pc+1];
				break;
			}
		} finally {
			if (!self.state.running) {
				self.fireEvent('stop', { target: self, world: self.world });
			}
		}
	}

	return self.state.running;
};

Runtime.prototype.next = function() {
	var self = this;

	if (!self.state.running) return;

	var world = self.world;

	if (self.state.ic >= world.maxInstructions) {
		self.state.running = false;
		self.state.error = 'INSTRUCTION LIMIT';

		return false;
	} else if (self.state.stackSize >= self.world.stackSize) {
		self.state.running = false;
		self.state.error = 'STACK';

		return false;
	}

	var rot;
	var di = [0, 1, 0, -1];
	var dj = [-1, 0, 1, 0];
	var param, newSP, op1, op2, fname;
	try {
		if (self.debug) {
			self.fireEvent('debug', {
				target: self,
				message: JSON.stringify(self.program[3*self.state.pc] + ' ' + self.raw_opcodes[self.state.pc]),
				debugType: 'opcode'
			});
		}

		switch (self.program[3*self.state.pc]) {
			case Runtime.HALT: {
				self.state.running = false;
				break;
			}

			case Runtime.LINE: {
				self.state.line = self.program[3*self.state.pc+1];
				break;
			}

			case Runtime.LEFT: {
				self.state.ic++;
				self.world.orientation--;
				if (self.world.orientation < 0) {
					self.world.orientation = 3;
				}
				self.world.dirty = true;
				break;
			}

			case Runtime.WORLDWALLS: {
				self.state.stack[++self.state.sp] = world.walls(world.i, world.j);
				break;
			}

			case Runtime.ORIENTATION: {
				self.state.stack[++self.state.sp] = world.orientation;
				break;
			}

			case Runtime.ROTL: {
				rot = self.state.stack[self.state.sp] - 1;
				if (rot < 0) {
					rot = 3;
				}
				self.state.stack[self.state.sp] = rot;
				break;
			}

			case Runtime.ROTR: {
				rot = self.state.stack[self.state.sp] + 1;
				if (rot > 3) {
					rot = 0;
				}
				self.state.stack[self.state.sp] = rot;
				break;
			}

			case Runtime.MASK: {
				self.state.stack[self.state.sp] = 1 << self.state.stack[self.state.sp];
				break;
			}

			case Runtime.NOT: {
				self.state.stack[self.state.sp] = (self.state.stack[self.state.sp] === 0) ? 1 : 0;
				break;
			}

			case Runtime.AND: {
				op2 = self.state.stack[self.state.sp--];
				op1 = self.state.stack[self.state.sp--];
				self.state.stack[++self.state.sp] = (op1 & op2) ? 1 : 0;
				break;
			}

			case Runtime.OR: {
				op2 = self.state.stack[self.state.sp--];
				op1 = self.state.stack[self.state.sp--];
				self.state.stack[++self.state.sp] = (op1 | op2) ? 1 : 0;
				break;
			}

			case Runtime.EQ: {
				op2 = self.state.stack[self.state.sp--];
				op1 = self.state.stack[self.state.sp--];
				self.state.stack[++self.state.sp] = (op1 == op2) ? 1 : 0;
				break;
			}

			case Runtime.EZ: {
				if (self.state.stack[self.state.sp--] === 0) {
					self.state.error = ['WALL', 'WORLDUNDERFLOW', 'BAGUNDERFLOW'][self.program[3*self.state.pc+1]];
					self.state.running = false;
				}
				break;
			}

			case Runtime.JZ: {
				self.state.ic++;
				if (self.state.stack[self.state.sp--] === 0) {
					self.state.pc += self.program[3*self.state.pc+1];
				}
				break;
			}

			case Runtime.JMP: {
				self.state.ic++;
				self.state.pc += self.program[3*self.state.pc+1];
				break;
			}

			case Runtime.FORWARD: {
				self.state.ic++;
				self.world.i += di[self.world.orientation];
				self.world.j += dj[self.world.orientation];
				self.world.dirty = true;
				break;
			}

			case Runtime.WORLDBUZZERS: {
				self.state.stack[++self.state.sp] = (self.world.buzzers(world.i, world.j));
				break;
			}

			case Runtime.BAGBUZZERS: {
				self.state.stack[++self.state.sp] = (self.world.bagBuzzers);
				break;
			}

			case Runtime.PICKBUZZER: {
				self.state.ic++;
				self.world.pickBuzzer(self.world.i, self.world.j);
				break;
			}

			case Runtime.LEAVEBUZZER: {
				self.state.ic++;
				self.world.leaveBuzzer(self.world.i, self.world.j);
				break;
			}

			case Runtime.LOAD: {
				self.state.stack[++self.state.sp] = self.program[3*self.state.pc+1];
				break;
			}

			case Runtime.POP: {
				self.state.sp--;
				break;
			}

			case Runtime.DUP: {
				self.state.stack[++self.state.sp] = self.state.stack[self.state.sp - 1];
				break;
			}

			case Runtime.DEC: {
				self.state.stack[self.state.sp]--;
				break;
			}

			case Runtime.INC: {
				self.state.stack[self.state.sp]++;
				break;
			}

			case Runtime.CALL: {
				self.state.ic++;
				// sp, pc, param
				param = self.state.stack[self.state.sp--];
				newSP = self.state.sp;
				fname = self.function_names[self.program[3*self.state.pc+2]];

				self.state.stack[++self.state.sp] = self.state.fp;
				self.state.stack[++self.state.sp] = newSP;
				self.state.stack[++self.state.sp] = self.state.pc;
				self.state.stack[++self.state.sp] = param;

				self.state.fp = newSP + 1;
				self.state.pc = self.program[3*self.state.pc+1];
				self.state.jumped = true;
				self.state.stackSize++;

				if (self.state.stackSize >= self.world.stackSize) {
					self.state.running = false;
					self.state.error = 'STACK';
				} else if (!self.disableStackEvents) {
					self.fireEvent('call', {
						'function': fname,
						param: param,
						line: self.state.line,
						target: self
					});
				}
				break;
			}

			case Runtime.RET: {
				self.state.pc = self.state.stack[self.state.fp + 2];
				self.state.sp = self.state.stack[self.state.fp + 1];
				self.state.fp = self.state.stack[self.state.fp];
				self.state.stackSize--;
				if (!self.disableStackEvents) {
					self.fireEvent('return', {target: self});
				}
				break;
			}

			case Runtime.PARAM: {
				self.state.stack[++self.state.sp] = 
					self.state.stack[self.state.fp + 3 + self.program[3*self.state.pc+1]];
				break;
			}

			default: {
				self.state.running = false;
				if (self.debug) {
					self.fireEvent('debug', {
						target: self,
						message: 'Missing opcode ' + self.raw_opcodes[self.state.pc][0],
						debugType: 'opcode'});
				}

				self.state.error = 'INVALIDOPCODE';
				return false;
			}
		};

		if (self.state.jumped) {
			self.state.jumped = false;
		} else {
			self.state.pc++;
		}

		if (self.debug) {
			var subarray = [];
			for (var i = 0; i <= self.state.sp; i++) {
				subarray.push(self.state.stack[i]);
			}
			var copy = {
				pc: self.state.pc,
				sp: self.state.sp,
				fp: self.state.fp,
				line: self.state.line,
				ic: self.state.ic,
				stack: subarray,
				running: self.state.running
			};
			self.fireEvent('debug', {
				target: self,
				message: JSON.stringify(copy),
				debugType: 'state'
			});
		}
	} catch (e) {
		self.state.running = false;
		console.error(e);
		console.log(e.stack);
		throw e;
	}

	return true;
};

var World = function(w, h) {
	var self = this;

  self.init(w, h);
};

World.prototype.init = function(w, h) {
	var self = this;

	self.w = w;
	self.h = h;
	self.runtime = new Runtime(self);
	if (ArrayBuffer) {
		var len = (self.w + 2) * (self.h + 2);
		self.map = new Int32Array(new ArrayBuffer(len * 4));
		self.currentMap = new Int32Array(new ArrayBuffer(len * 4));
		self.wallMap = new Uint8Array(new ArrayBuffer(len));
	} else {
		self.map = [];
		self.currentMap = [];
		self.wallMap = [];

		for (var i = 0; i <= self.h; i++) {
			for (var j = 0; j <= self.w; j++) {
				self.map.push(0);
				self.currentMap.push(0);
				self.wallMap.push(0);
			}
		}
	}

	for (var i = 1; i <= self.h; i++) {
		self.addWall(i, 1, 0);
		self.addWall(i, self.w, 2);
  }

	for (var j = 1; j <= self.w; j++) {
		self.addWall(self.h, j, 1);
		self.addWall(1, j, 3);
	}

	self.orientation = 1;
	self.startOrientation = 1;
	self.start_i = 1;
	self.i = 1;
	self.start_j = 1;
	self.j = 1;
	self.startBagBuzzers = 0;
	self.bagBuzzers = 0;
	self.dumps = {};
	self.dumpCells = [];
	self.maxInstructions = 10000000;
	self.stackSize = 65000;
	self.worldName = 'mundo_0';
	self.programName = 'p1';

	self.dirty = true;
};

World.DUMP_WORLD = 'mundo';
World.DUMP_POSITION = 'posicion';
World.DUMP_ORIENTATION = 'orientacion';
World.DUMP_INSTRUCTIONS = 'instrucciones';
World.DUMP_BAG = 'mochila';
World.ERROR_MAPPING = {
	BAGUNDERFLOW: 'ZUMBADOR INVALIDO',
	WALL: 'MOVIMIENTO INVALIDO',
	WORLDUNDERFLOW: 'ZUMBADOR INVALIDO',
	STACK: 'STACK OVERFLOW'
};

World.prototype.walls = function(i, j) {
	var self = this;

	if (0 > i || i > self.h || 0 > j || j > self.w) return 0;
	return self.wallMap[self.w * i + j];
};

World.prototype.toggleWall = function(i, j, orientation) {
	var self = this;

	if (j == 1 && orientation === 0 ||
			i == 1 && orientation == 3 ||
			i == self.h && orientation == 1 ||
			j == self.w && orientation == 2) {
		return;
	}

	if (orientation < 0 || orientation >= 4 || 0 > i || i > self.h || 0 > j || j > self.w) return;
	// Needed to prevent Karel from traversing walls from one direction, but not
	// from the other.
	self.wallMap[self.w * i + j] ^= (1 << orientation);

	if (orientation === 0 && j > 1) {
		self.wallMap[self.w * i + (j - 1)] ^= (1 << 2);
	} else if (orientation === 1 && i <= self.h) {
		self.wallMap[self.w * (i + 1) + j] ^= (1 << 3);
	} else if (orientation === 2 && j <= self.w) {
		self.wallMap[self.w * i + (j + 1)] ^= (1 << 0);
	} else if (orientation === 3 && i > 1) {
		self.wallMap[self.w * (i - 1) + j] ^= (1 << 1);
	}

	self.dirty = true;
};

World.prototype.addWall = function(i, j, orientation) {
	var self = this;

	if (orientation < 0 || orientation >= 4 || 0 > i || i > self.h || 0 > j || j > self.w) return;
	self.wallMap[self.w * i + j] |= (1 << orientation);

	if (orientation === 0 && j > 1) self.wallMap[self.w * i + (j - 1)] |= (1 << 2);
	else if (orientation === 1 && i <= self.h) self.wallMap[self.w * (i + 1) + j] |= (1 << 3);
	else if (orientation === 2 && j <= self.w) self.wallMap[self.w * i + (j + 1)] |= (1 << 0);
	else if (orientation === 3 && i > 1) self.wallMap[self.w * (i - 1) + j] |= (1 << 1);

	self.dirty = true;
};

World.prototype.setBuzzers = function(i, j, count) {
	var self = this;

	if (0 > i || i > self.h || 0 > j || j > self.w) return;
	self.map[self.w * i + j] = self.currentMap[self.w * i + j] =
		(count == 0xffff) ? -1 : count;
	self.dirty = true;
};

World.prototype.buzzers = function(i, j) {
	var self = this;

	if (0 > i || i > self.h || 0 > j || j > self.w) return 0;
	return self.currentMap[self.w * i + j];
};

World.prototype.pickBuzzer = function(i, j) {
	var self = this;

	if (0 > i || i > self.h || 0 > j || j > self.w) return;
	if (self.currentMap[self.w * i + j] != -1) {
		self.currentMap[self.w * i + j]--;
	}
	if (self.bagBuzzers != -1) {
		self.bagBuzzers++;
	}
	self.dirty = true;
};

World.prototype.leaveBuzzer = function(i, j) {
	var self = this;

	if (0 > i || i > self.h || 0 > j || j > self.w) return;
	if (self.currentMap[self.w * i + j] != -1) {
		self.currentMap[self.w * i + j]++;
	}
	if (self.bagBuzzers != -1) {
		self.bagBuzzers--;
	}
	self.dirty = true;
};

World.prototype.setDumpCell = function(i, j, dumpState) {
	var self = this;
	var dumpPos = -1;

	for (dumpPos = 0; dumpPos < self.dumpCells.length; dumpPos++) {
		if (self.dumpCells[dumpPos][0] == i && self.dumpCells[dumpPos][1] == j) {
			break;
		}
	}

	if (dumpPos < self.dumpCells.length) {
		if (dumpState) return;
		self.dumpCells.splice(dumpPos, 0);
	} else {
		if (!dumpState) return;
		self.dumpCells.push([i, j]);
	}

	self.dumps[World.DUMP_WORLD] = self.dumpCells.length !== 0;
};

World.prototype.toggleDumpCell = function(i, j) {
	var self = this;
	var dumpPos = 0;

	for ( ; dumpPos < self.dumpCells.length; dumpPos++) {
		if (self.dumpCells[dumpPos][0] == i && self.dumpCells[dumpPos][1] == j) {
			break;
		}
	}

	if (dumpPos < self.dumpCells.length) {
		self.dumpCells.splice(dumpPos, 1);
	} else {
		self.dumpCells.push([i, j]);
	}

	self.dumps[World.DUMP_WORLD] = self.dumpCells.length !== 0;
};

World.prototype.getDumpCell = function(i, j) {
	var self = this;
	var dumpPos = -1;

	for (dumpPos = 0; dumpPos < self.dumpCells.length; dumpPos++) {
		if (self.dumpCells[dumpPos][0] == i && self.dumpCells[dumpPos][1] == j) {
			return true;
		}
	}

	return false;
};

World.prototype.getDumps = function(d) {
	var self = this;
	return self.dumps.hasOwnProperty(d.toLowerCase()) && self.dumps[d];
};

World.prototype.setDumps = function(d, v) {
	var self = this;
	self.dumps[d] = v;
};

World.prototype.toggleDumps = function(d) {
	var self = this;

	self.setDumps(d, !self.getDumps(d));
};

World.prototype.load = function(doc) {
	var self = this;

	for (var i = 0; i < self.wallMap.length; i++) {
		self.wallMap[i] = 0;
	}

	for (var i = 0; i < self.map.length; i++) {
		self.map[i] = self.currentMap[i] = 0;
	}

	for (var i = 1; i <= self.h; i++) {
		self.addWall(i, 1, 0);
		self.addWall(i, self.w, 2);
  }

	for (var j = 1; j <= self.w; j++) {
		self.addWall(self.h, j, 1);
		self.addWall(1, j, 3);
	}

	self.dumps = {};
	self.dumpCells = [];
	self.maxInstructions = 10000000;
	self.stackSize = 65000;

	var rules = {
		condiciones: function(condiciones) {
			self.maxInstructions =
				parseInt(condiciones.getAttribute('instruccionesMaximasAEjecutar'), 10) || 10000000;
			self.stackSize = parseInt(condiciones.getAttribute('longitudStack'), 10) || 65000;
		},

		monton: function(monton) {
			var i = parseInt(monton.getAttribute('y'), 10);
			var j = parseInt(monton.getAttribute('x'), 10);
			self.setBuzzers(i, j, parseInt(monton.getAttribute('zumbadores'), 10));
		},

		pared: function(pared) {
			var i = parseInt(pared.getAttribute('y1'), 10) + 1;
			var j = parseInt(pared.getAttribute('x1'), 10) + 1;

			if (pared.getAttribute('x2')) {
				var j2 = parseInt(pared.getAttribute('x2'), 10) + 1;

				if (j2 > j) {
					self.addWall(i, j, 3);
				} else {
					self.addWall(i, j2, 3);
				}
			} else if(pared.getAttribute('y2')) {
				var i2 = parseInt(pared.getAttribute('y2'), 10) + 1;

				if (i2 > i) {
					self.addWall(i, j, 0);
				} else {
					self.addWall(i2, j, 0);
				}
			}
		},

		despliega: function(despliega) {
			self.dumps[despliega.getAttribute('tipo').toLowerCase()] = true;
		},

		posicionDump: function(dump) {
			self.dumpCells.push([
				parseInt(dump.getAttribute('y'), 10),
				parseInt(dump.getAttribute('x'), 10)]);
		},

		programa: function(programa) {
			self.di = self.h / 2 - parseInt(programa.getAttribute('yKarel'), 10);
			self.dj = self.w / 2 - parseInt(programa.getAttribute('xKarel'), 10);
			self.rotate(programa.getAttribute('direccionKarel'));
			self.worldName = programa.getAttribute('mundoDeEjecucion');
			self.programName = programa.getAttribute('nombre');
			self.move(
				parseInt(programa.getAttribute('yKarel'), 10),
				parseInt(programa.getAttribute('xKarel'), 10));
			var bagBuzzers = programa.getAttribute('mochilaKarel') || 0;
			if (bagBuzzers == 'INFINITO') {
				self.setBagBuzzers(-1);
			} else {
				self.setBagBuzzers(parseInt(bagBuzzers));
			}
		}
	};

	function traverse(node) {
		var type = node.nodeName;
		if (rules.hasOwnProperty(type)) {
			rules[type](node);
		}

		for (var i = 0; i < node.childNodes.length; i++) {
			if (node.childNodes[i].nodeType == node.ELEMENT_NODE) {
				traverse(node.childNodes[i]);
			}
		}
	}

	traverse(doc);

	self.reset();
};

World.prototype.serialize = function(node, name, indentation) {
	var self = this;

	var result = '';
	for (var i = 0; i < indentation; i++) {
		result += '\t';
	}

	if (typeof node === 'string' || typeof node === 'number') {
		return result + node;
	}

	if (Array.isArray(node)) {
		result = '';

		for (var i = 0; i < node.length; i++) {
			result += self.serialize(node[i], name, indentation);
		}
	} else {
		var childResult = '';

		for (var p in node) {
			if (node.hasOwnProperty(p)) {
				if (p[0] == '#') {
					continue;
				} else {
					childResult += self.serialize(node[p], p, indentation + 1);
				}
			}
		}

		result += '<' + name;

		if (node.hasOwnProperty('#attributes')) {
			for (var p in node['#attributes']) {
				if (node['#attributes'].hasOwnProperty(p)) {
					result += ' ' + p + '="' + node['#attributes'][p] + '"';
				}
			}
		}

		if (node.hasOwnProperty('#text')) {
			result += '>' + node['#text'] + '</' + name + '>\n';
		} else if (childResult == '') {
			result += '/>\n';
		} else {
			result += '>\n';
			result += childResult;
			for (var i = 0; i < indentation; i++) {
				result += '\t';
			}
			result += '</' + name + '>\n';
		}
	}

	return result;
};

World.prototype.save = function() {
	var self = this;

	var result = {
		condiciones: {
			'#attributes': {
				instruccionesMaximasAEjecutar: self.maxInstructions,
				longitudStack: self.stackSize
			}
		},
		mundos: {
			mundo: {
				'#attributes': {
					nombre: self.worldName,
					ancho: self.w,
					alto: self.h
				},
				monton: [],
				pared: [],
				posicionDump: []
			}
		},
		programas: {
			'#attributes': {
				tipoEjecucion: 'CONTINUA',
				intruccionesCambioContexto: 1,
				milisegundosParaPasoAutomatico: 0
			},
			programa: {
				'#attributes': {
					nombre: self.programName,
					ruta: '{$2$}',
					mundoDeEjecucion: self.worldName,
					xKarel: self.j,
					yKarel: self.i,
					direccionKarel: ['OESTE', 'NORTE', 'ESTE', 'SUR'][self.orientation],
					mochilaKarel: self.bagBuzzers == -1 ? 'INFINITO' : self.bagBuzzers
				},
				despliega: []
			}
		}
	};

	for (var i = 1; i <= self.h; i++) {
		for (var j = 1; j <= self.w; j++) {
			var buzzers = self.buzzers(i, j);
			if(buzzers !== 0) {
				result.mundos.mundo.monton.push({
					'#attributes': {
						x: j,
						y: i,
						zumbadores: buzzers == -1 ? 'INFINITO' : buzzers}});
			}
		}
	}

	for (var i = 1; i <= self.h; i++) {
		for (var j = 1; j <= self.w; j++) {
			var walls = self.walls(i, j);
			for (var k = 2; k < 8; k <<= 1) {
				if (i == self.h && k == 2) continue;
				if (j == self.w && k == 4) continue;

				if ((walls & k) == k) {
					if (k == 2) {
						result.mundos.mundo.pared.push(
							{'#attributes': {x1: j - 1, y1: i, x2: j}});
					} else if (k == 4) {
						result.mundos.mundo.pared.push(
							{'#attributes': {x1: j, y1: i - 1, y2: i}});
					}
				}
			}
		}
	}

	for (var i = 0; i < self.dumpCells.length; i++) {
		result.mundos.mundo.posicionDump.push(
			{'#attributes': {x: self.dumpCells[i][1], y: self.dumpCells[i][0]}});
	}

	for (var p in self.dumps) {
		if (self.dumps.hasOwnProperty(p) && self.dumps[p]) {
			result.programas.programa.despliega.push({'#attributes': {tipo: p.toUpperCase()}});
		}
	}

	return self.serialize(result, 'ejecucion', 0);
};

World.prototype.output = function() {
	var self = this;

	var result = {};

	if (self.dumps[World.DUMP_WORLD]) {
		result.mundos = {mundo: {'#attributes': {nombre: self.worldName}, linea: []}};

		var dumpCells = {};
		for (var i = 0; i < self.dumpCells.length; i++) {
			if (!dumpCells.hasOwnProperty(self.dumpCells[i][0])) {
				dumpCells[self.dumpCells[i][0]] = {};
			}
			dumpCells[self.dumpCells[i][0]][self.dumpCells[i][1]] = true;
		}

		for (var i = self.h; i > 0; i--) {
			var printCoordinate = true;
			var line = '';

			for (var j = 1; j <= self.w; j++) {
				if (dumpCells[i] && dumpCells[i][j]) {
					if (self.buzzers(i, j) !== 0) {
						if (printCoordinate) {
							line += '(' + j + ') ';
						}
						// TODO: Este es un bug en karel.exe.
						line += (self.buzzers(i, j) & 0xffff) + ' ';
					}
					printCoordinate = self.buzzers(i, j) == 0;
				}
			}

			if (line !== '') {
				result.mundos.mundo.linea.push({
					'#attributes': {
						fila: i,
						compresionDeCeros: 'true'
					},
					'#text': line
				});
			}
		}
	}

	result.programas = {programa: {'#attributes': {nombre: self.programName}}};

	result.programas.programa['#attributes'].resultadoEjecucion =
		self.errorMap(self.runtime.state.error);

	if (self.dumps[World.DUMP_POSITION]) {
		result.programas.programa.karel = {'#attributes': {x: self.j, y: self.i}};
	}

	if (self.dumps[World.DUMP_ORIENTATION]) {
		result.programas.programa.karel =
			result.programas.programa.karel || {'#attributes':{}};
		result.programas.programa.karel['#attributes'].direccion =
			['OESTE', 'NORTE', 'ESTE', 'SUR'][self.orientation];
	}

	if (self.dumps[World.DUMP_BAG]) {
		result.programas.programa.karel =
			result.programas.programa.karel || {'#attributes':{}};
		result.programas.programa.karel['#attributes'].mochila =
			self.bagBuzzers == -1 ? 'INFINITO' : self.bagBuzzers;
	}

	return self.serialize(result, 'resultados', 0);
};

World.prototype.errorMap = function(s) {
	if (!s) return 'FIN PROGRAMA';
	if (World.ERROR_MAPPING.hasOwnProperty(s)) {
		return World.ERROR_MAPPING[s];
	} else {
		return s;
	}
}

World.prototype.move = function(i, j) {
	var self = this;

	self.i = self.start_i = parseInt(i, 10);
	self.j = self.start_j = parseInt(j, 10);
	self.dirty = true;
};

World.prototype.rotate = function(orientation) {
	var self = this;

	var orientations = ['OESTE', 'NORTE', 'ESTE', 'SUR'];
	self.orientation = self.startOrientation = Math.max(0, orientations.indexOf(orientation));
	self.dirty = true;
};

World.prototype.setBagBuzzers = function(buzzers) {
	var self = this;

	self.bagBuzzers = self.startBagBuzzers = buzzers == 0xffff ? -1 : buzzers;
	self.dirty = true;
};

World.prototype.reset = function() {
	var self = this;

	self.orientation = self.startOrientation;
	self.move(self.start_i, self.start_j);
	self.bagBuzzers = self.startBagBuzzers;

	for (var i = 0; i < self.currentMap.length; i++) {
		self.currentMap[i] = self.map[i];
	}

	self.runtime.reset();

	self.dirty = true;
};

World.prototype.import = function(mdo, kec) {
	var self = this;

	if (mdo.length < 20 || kec.length < 30) {
		throw new Error('Invalid file format');
	}

	if (mdo[0] != 0x414b ||
			mdo[1] != 0x4552 ||
			mdo[2] != 0x204c ||
			mdo[3] != 0x4d4f ||
			mdo[4] != 0x2e49) {
		throw new Error('Invalid magic number');
	}

	//var x1 = mdo[5];
	var width = mdo[6];
	var height = mdo[7];
	self.init(width, height);
	self.setBagBuzzers(mdo[8]);
	self.move(mdo[10], mdo[9]);
  self.orientation = self.startOrientation = mdo[11] % 4;
	var wallcount = mdo[12];
	var heapcount = mdo[13];
	//var x10 = mdo[14];

	self.maxInstructions = 10000000;
	self.stackSize = 65000;
	if (kec[0]) {
		self.maxInstructions = kec[1];
	}
	/*
	maxmove = kec[1][1] if kec[1][0] else False
	maxturnleft = kec[2][1] if kec[2][0] else False
	maxpickbeeper = kec[3][1] if kec[3][0] else False
	maxputbeeper = kec[4][1] if kec[4][0] else False
	maxkarelbeepers = kec[5][1] if kec[5][0] else False
	maxbeepers = kec[6][1] if kec[6][0] else False
	*/
	if (kec[21]) {
		self.setDumps(World.DUMP_POSITION, true);
	}
	if (kec[24]) {
		self.setDumps(World.DUMP_ORIENTATION, true);
	}
	// TODO(lhchavez): DUMP_BAG
	var dumpcount = kec[27] ? kec[28] : 0;
	if (dumpcount) {
		self.setDumps(World.DUMP_WORLD, true);
	}

	function decodeWalls(tx, ty, tmask) {
		for (var i = 0; i < 4; i++) {
			if (tmask & (1 << i)) {
				self.addWall(ty, tx, (i + 1) % 4);
			}
		}
	}

	for (var i = 15; i < 15 + 3 * wallcount; i += 3) {
		decodeWalls(mdo[i], mdo[i + 1], mdo[i + 2]);
	}

	for (var i = 15 + 3 * wallcount; i < 15 + 3 * (wallcount + heapcount); i += 3) {
		self.setBuzzers(mdo[i + 1], mdo[i], mdo[i + 2]);
	}

	for (var i = 30; i < 30 + 3 * dumpcount; i += 3) {
		self.setDumpCell(kec[i + 1], kec[i], true);
	}
};

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
	exports.World = World;
}
