/**
 * A class that implements the W3C DOM's EventTarget interface.
 * http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget
 */
var EventTarget = function() {
	var self = this;
	self.listeners = {};
};

EventTarget.prototype.addEventListener = function(type, listener, useCapture) {
	var self = this;
	if (!self.listeners.hasOwnProperty(type)) {
		self.listeners[type] = [];
	}
	self.listeners[type].push(listener);
};

EventTarget.prototype.removeEventListener = function(type, listener, useCapture) {
	var self = this;
	if (self.listeners.hasOwnProperty(type)) {
		var index = self.listeners.indexOf(listener);
		if (index > -1) {
			self.listeners.splice(index, 1);
		}
	}
};

EventTarget.prototype.dispatchEvent = function(evt) {
	var self = this;
	if (self.listeners.hasOwnProperty(evt.type)) {
		for (var i = 0; i < self.listeners[evt.type].length; i++) {
			self.listeners[evt.type][i](evt);
		}
	}
};

EventTarget.prototype.fireEvent = function(type, properties) {
	var self = this;
	
	var event = null;
	
	// IE does not support the construction of custom events through
	// standard means. ugh.
	if (document && document.createEventObject) {
		event = document.createEventObject();
		event.type = type;
	} else {
		event = new Event(type);
	}
	
	if (properties) {
		for (var p in properties) {
			if (properties.hasOwnProperty(p)) {
				event[p] = properties[p];
			}
		}
	}
	
	self.dispatchEvent(event);
};

if (typeof Event === 'undefined') {
	var Event = function(type) {
		this.type = type;
	};
}

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

	self.program = [['HALT']];

	self.reset();
};

Runtime.prototype = new EventTarget();

Runtime.prototype.load = function(opcodes) {
	var self = this;

	self.program = opcodes;
	self.reset();
};

Runtime.prototype.reset = function() {
	var self = this;

	self.state = {
		pc: 0,
		sp: -1,
		line: 0,
		stack: [],
		stackSize: 0,
		ic: 0,

		// Flags
		jumped: false,
		running: true
	};

	if (self.debug) {
		self.fireEvent('debug', {target: self, message: JSON.stringify(self.program)});
	}
};

Runtime.prototype.step = function() {
	var self = this;

	while (self.state.running) {
		self.next();

		if (self.state.running && self.program[self.state.pc][0] == 'LINE') {
			self.state.line = self.program[self.state.pc][1];
			break;
		}
	}

	return self.state.running;
};

Runtime.prototype.next = function() {
	var self = this;

	if (!self.state.running) return;

	var world = self.world;

	self.state.ic += 1;
	if (self.state.ic >= world.maxInstructions) {
		self.state.running = false;
		self.state.error = 'INSTRUCTION LIMIT';

		return;
	}

	var opcodes = {
		'HALT': function(state, params) {
			state.running = false;
		},

		'LINE': function(state, params) {
			state.line = params[0];
		},

		'LEFT': function(state, params) {
			world.orientation--;
			if (world.orientation < 0) {
				world.orientation = 3;
			}
			world.dirty = true;
		},

		'WORLDWALLS': function(state, params) {
			state.stack.push(world.walls(world.i, world.j));
		},

		'ORIENTATION': function(state, params) {
			state.stack.push(world.orientation);
		},

		'ROTL': function(state, params) {
			var rot = state.stack.pop() - 1;
			if (rot < 0) {
				rot = 3;
			}
			state.stack.push(rot);
		},

		'ROTR': function(state, params) {
			var rot = state.stack.pop() + 1;
			if (rot > 3) {
				rot = 0;
			}
			state.stack.push(rot);
		},

		'MASK': function(state, params) {
			state.stack.push(1 << state.stack.pop());
		},

		'NOT': function(state, params) {
			state.stack.push((state.stack.pop() === 0) ? 1 : 0);
		},

		'AND': function(state, params) {
			state.stack.push((state.stack.pop() & state.stack.pop()) ? 1 : 0);
		},

		'OR': function(state, params) {
			state.stack.push((state.stack.pop() | state.stack.pop()) ? 1 : 0);
		},

		'EQ': function(state, params) {
			state.stack.push((state.stack.pop() == state.stack.pop()) ? 1 : 0);
		},

		'EZ': function(state, params) {
			if (state.stack.pop() === 0) {
				state.error = params[0];
				state.running = false;
			}
		},

		'JZ': function(state, params) {
			if (state.stack.pop() === 0) {
				state.pc += params[0];
			}
		},

		'JNZ': function(state, params) {
			if (state.stack.pop() !== 0) {
				state.pc += params[0];
			}
		},

		'JLEZ': function(state, params) {
			if (state.stack.pop() <= 0) {
				state.pc += params[0];
			}
		},

		'JMP': function(state, params) {
			state.pc += params[0];
		},

		'FORWARD': function(state, params) {
			var di = [0, 1, 0, -1];
			var dj = [-1, 0, 1, 0];

			world.i += di[world.orientation];
			world.j += dj[world.orientation];
			world.dirty = true;
		},

		'WORLDBUZZERS': function(state, params) {
			state.stack.push(world.buzzers(world.i, world.j));
		},

		'BAGBUZZERS': function(state, params) {
			state.stack.push(world.bagBuzzers);
		},

		'PICKBUZZER': function(state, params) {
			world.pickBuzzer(world.i, world.j);
		},

		'LEAVEBUZZER': function(state, params) {
			world.leaveBuzzer(world.i, world.j);
		},

		'LOAD': function(state, params) {
			state.stack.push(params[0]);
		},

		'POP': function(state, params) {
			state.stack.pop();
		},

		'DUP': function(state, params) {
			state.stack.push(state.stack[state.stack.length - 1]);
		},

		'DEC': function(state, params) {
			state.stack.push(state.stack.pop() - 1);
		},

		'INC': function(state, params) {
			state.stack.push(state.stack.pop() + 1);
		},

		'CALL': function(state, params) {
			// sp, pc, param
			var param = state.stack.pop();
			var newSP = state.stack.length;

			state.stack.push(state.sp);
			state.stack.push(state.pc);
			state.stack.push(param);

			state.sp = newSP;
			state.pc = params[0];
			state.jumped = true;
			state.stackSize++;

			if (state.stackSize >= world.stackSize) {
				state.running = false;
				state.error = 'STACK';
			} else {
				self.fireEvent('call', {'function': params[1], line: state.line, target: self});
			}
		},

		'RET': function(state, params) {
			var oldSP = state.sp;
			state.pc = state.stack[state.sp + 1];
			state.sp = state.stack[state.sp];

			while (state.stack.length > oldSP) {
				state.stack.pop();
			}
			state.stackSize--;
			self.fireEvent('return', {target: self});
		},

		'PARAM': function(state, params) {
			state.stack.push(state.stack[state.sp + 2 + params[0]]);
		}
	};

	try {
		var opcode = self.program[self.state.pc];
		if (!opcodes[opcode[0]]) {
			self.state.running = false;
			if (self.debug) {
				self.fireEvent('debug', {target: self, message: 'Missing opcode ' + opcode[0], debugType: 'opcode'});
			}
			self.state.error = 'INVALIDOPCODE';
			return false;
		}

		opcodes[opcode[0]](self.state, opcode.slice(1));

		if (self.state.jumped) {
			self.state.jumped = false;
		} else {
			self.state.pc += 1;
		}

		if (self.debug) {
			self.fireEvent('debug', {target: self, message: JSON.stringify(opcode), debugType: 'opcode'});
			self.fireEvent('debug', {target: self, message: JSON.stringify(self.state)});
		}
	} catch (e) {
		self.state.running = false;
		console.log(e);
		console.log(e.stack);
		throw e;
	}

	return true;
};

var World = function(w, h) {
	var self = this;

	self.w = w + 1;
	self.h = h + 1;
	self.runtime = new Runtime(self);
	if (ArrayBuffer) {
		self.map = new Int16Array(new ArrayBuffer(self.w * self.h * 2));
		self.currentMap = new Int16Array(new ArrayBuffer(self.w * self.h * 2));
		self.wallMap = new Uint8Array(new ArrayBuffer(self.w * self.h));
	} else {
		self.map = [];
		self.currentMap = [];
		self.wallMap = [];

		for (var i = 0; i < self.h; i++) {
			for (var j = 0; j < self.w; j++) {
				self.map.push(0);
				self.currentMap.push(0);
				self.wallMap.push(0);
			}
		}
	}

	for (var i = 0; i < self.h; i++) {
		self.addWall(1, i, 3);
		self.addWall(i, 1, 0);
		self.addWall(self.h - 1, i, 1);
		self.addWall(i, self.w - 1, 2);
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

	self.dirty = true;
};

World.prototype.walls = function(i, j) {
	var self = this;

	if (0 > i || i >= self.h || 0 > j || j >= self.w) return 0;
	return self.wallMap[self.w * i + j];
};

World.prototype.toggleWall = function(i, j, orientation) {
	var self = this;

	if (j == 1 && orientation == 0
	    || i == 1 && orientation == 3
	    || i == self.h - 1 && orientation == 1
	    || j == self.w - 1 && orientation == 2) {
		return;
	}

	if (orientation < 0 || orientation >= 4 || 0 > i || i >= self.h || 0 > j || j >= self.w) return;
	// Needed to prevent Karel from traversing walls from one direction, but not
	// from the other.
	self.wallMap[self.w * i + j] ^= (1 << orientation);

	if (orientation === 0 && j > 1) {
		self.wallMap[self.w * i + (j - 1)] ^= (1 << 2);
	} else if (orientation === 1 && i < self.h) {
		self.wallMap[self.w * (i + 1) + j] ^= (1 << 3);
	} else if (orientation === 2 && j < self.w) {
		self.wallMap[self.w * i + (j + 1)] ^= (1 << 0);
	} else if (orientation === 3 && i > 1) {
		self.wallMap[self.w * (i - 1) + j] ^= (1 << 1);
	}

	self.dirty = true;
};

World.prototype.addWall = function(i, j, orientation) {
	var self = this;

	if (orientation < 0 || orientation >= 4 || 0 > i || i >= self.h || 0 > j || j >= self.w) return;
	self.wallMap[self.w * i + j] |= (1 << orientation);

	if (orientation === 0 && j > 1) self.wallMap[self.w * i + (j - 1)] |= (1 << 2);
	else if (orientation === 1 && i < self.h) self.wallMap[self.w * (i + 1) + j] |= (1 << 3);
	else if (orientation === 2 && j < self.w) self.wallMap[self.w * i + (j + 1)] |= (1 << 0);
	else if (orientation === 3 && i > 1) self.wallMap[self.w * (i - 1) + j] |= (1 << 1);

	self.dirty = true;
};

World.prototype.setBuzzers = function(i, j, count) {
	var self = this;

	if (0 > i || i >= self.h || 0 > j || j >= self.w) return;
	self.map[self.w * i + j] = self.currentMap[self.w * i + j] = count;
	self.dirty = true;
};

World.prototype.buzzers = function(i, j) {
	var self = this;

	if (0 > i || i >= self.h || 0 > j || j >= self.w) return 0;
	return self.currentMap[self.w * i + j];
};

World.prototype.pickBuzzer = function(i, j) {
	var self = this;

	if (0 > i || i >= self.h || 0 > j || j >= self.w) return;
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

	if (0 > i || i >= self.h || 0 > j || j >= self.w) return;
	if (self.currentMap[self.w * i + j] != -1) {
		self.currentMap[self.w * i + j]++;
	}
	if (self.bagBuzzers != -1) {
		self.bagBuzzers--;
	}
	self.dirty = true;
};

World.prototype.load = function(doc) {
	var self = this;

	for (var i = 0; i < self.wallMap.length; i++) {
		self.wallMap[i] = 0;
	}

	for (var i = 0; i < self.map.length; i++) {
		self.map[i] = self.currentMap[i] = 0;
	}

	for (var i = 0; i < self.h; i++) {
		self.addWall(1, i, 3);
		self.addWall(i, 1, 0);
		self.addWall(self.h - 1, i, 1);
		self.addWall(i, self.w - 1, 2);
	}

	self.dumps = {};
	self.dumpCells = [];
	self.maxInstructions = 10000000;
	self.stackSize = 65000;

	var rules = {
		condiciones: function(condiciones) {
			self.maxInstructions = parseInt(condiciones.getAttribute('instruccionesMaximasAEjecutar'));
			self.stackSize = parseInt(condiciones.getAttribute('longitudStack'));
		},

		monton: function(monton) {
			var i = parseInt(monton.getAttribute('y'), 10);
			var j = parseInt(monton.getAttribute('x'), 10);
			self.setBuzzers(i, j, parseInt(monton.getAttribute('zumbadores'), 10));
		},

		pared: function(pared) {
			var i = parseInt(pared.getAttribute('y1'), 10) + 1;
			var j = parseInt(pared.getAttribute('x1'), 10) + 1;

			if (pared.attr('x2')) {
				var j2 = parseInt(pared.getAttribute('x2'), 10) + 1;

				if (j2 > j) {
					self.addWall(i, j, 3);
				} else {
					self.addWall(i, j2, 3);
				}
			} else if(pared.attr('y2')) {
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
			self.dumpCells.push([dump.getAttribute('y'), dump.getAttribute('x')]);
		},

		programa: function(programa) {
			self.di = self.h / 2 - parseInt(programa.getAttribute('yKarel'), 10);
			self.dj = self.w / 2 - parseInt(programa.getAttribute('xKarel'), 10);
			self.rotate(programa.getAttribute('direccionKarel'));
			self.move(parseInt(programa.getAttribute('yKarel'), 10), parseInt(programa.getAttribute('xKarel'), 10));
		}
	};

	function traverse(node) {
		var type = node.nodeName;
		if (rules.hasOwnProperty(node.nodeName)) {
			rules[node.nodeName](node);
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

	var result = "";
	for (var i = 0; i < indentation; i++) {
		result += "\t";
	}

	if (typeof node === 'string' || typeof node === 'number') {
		return result + node;
	}

	if (Array.isArray(node)) {
		result = "";

		for (var i = 0; i < node.length; i++) {
			result += self.serialize(node[i], name, indentation);
		}
	} else {
		var childResult = "";

		for (var p in node) {
			if (!node.hasOwnProperty(p)) continue;
			if (p[0] == '#') {
				continue;
			} else {
				childResult += self.serialize(node[p], p, indentation + 1);
			}
		}

		result += "<" + name;

		if (node.hasOwnProperty('#attributes')) {
			for (var p in node['#attributes']) {
				if (!node['#attributes'].hasOwnProperty(p)) continue;
				result += ' ' + p + '="' + node['#attributes'][p] + '"';
			}
		}

		if (node.hasOwnProperty('#text')) {
			result += ">" + node['#text'] + '</' + name + '>\n';
		} else if (childResult === "") {
			result += "/>\n";
		} else {
			result += ">\n";
			result += childResult;
			for (var i = 0; i < indentation; i++) {
				result += "\t";
			}
			result += "</" + name + ">\n";
		}
	}

	return result;
};

World.prototype.save = function() {
	var self = this;

	var result = {
		condiciones: {
			'#attributes': {instruccionesMaximasAEjecutar: self.maxInstructions, longitudStack: self.stackSize}
		},
		mundos: {
			mundo: {
				'#attributes': {nombre: 'mundo_0', ancho: self.w, alto: self.h},
				monton: [],
				pared: [],
				posicionDump: []
			}
		},
		programas: {
			'#attributes': {tipoEjecucion: 'CONTINUA', intruccionesCambioContexto: 1, milisegundosParaPasoAutomatico: 0},
			programa: {
				'#attributes': {
					nombre: "p1",
					ruta: "{$2$}",
					mundoDeEjecucion: "mundo_0",
					xKarel: self.j,
					yKarel: self.i,
					direccionKarel: ['OESTE', 'NORTE', 'ESTE', 'SUR'][self.orientation],
					mochilaKarel: self.bagBuzzers == -1 ? 'INFINITO' : self.bagBuzzers
				},
				despliega: []
			}
		}
	};

	for (var i = 0; i < self.h; i++) {
		for (var j = 0; j < self.w; j++) {
			var buzzers = self.buzzers(i, j);
			if(buzzers != 0) {
				result.mundos.mundo.monton.push({'#attributes': {x: j, y: i, zumbadores: buzzers == -1 ? 'INFINITO' : buzzers}});
			}
		}
	}

	for (var i = 1; i < self.h; i++) {
		for (var j = 1; j < self.w; j++) {
			var walls = self.walls(i, j);
			for (var k = 2; k < 8; k <<= 1) {
				if (i == self.h - 1 && k == 2) continue;
				if (j == self.w - 1 && k == 4) continue;

				if ((walls & k) == k) {
					if (k == 2) {
						result.mundos.mundo.pared.push({'#attributes': {x1: j - 1, y1: i, x2: j}});
					} else if (k == 4) {
						result.mundos.mundo.pared.push({'#attributes': {x1: j, y1: i - 1, y2: i}});
					}
				}
			}
		}
	}

	for (var i = 0; i < self.dumpCells.length; i++) {
		result.mundos.mundo.posicionDump.push({'#attributes': {x: self.dumpCells[i][1], y: self.dumpCells[i][0]}});
	}

	for (var p in self.dumps) {
		if (!self.dumps.hasOwnProperty(p)) continue;
		result.programas.programa.despliega.push({'#attributes': {tipo: p.toUpperCase()}});
	}

	return self.serialize(result, 'ejecucion', 0);
};

World.prototype.output = function() {
	var self = this;

	var result = {};

	if (self.dumps.mundo) {
		result.mundos = {mundo: {'#attributes': {nombre: 'mundo_0'}, linea: []}};

		var dumpCells = {};
		for (var i = 0; i < self.dumpCells.length; i++) {
			if (!dumpCells.hasOwnProperty(self.dumpCells[i][0])) {
				dumpCells[self.dumpCells[i][0]] = {};
			}
			dumpCells[self.dumpCells[i][0]][self.dumpCells[i][1]] = true;
		}

		for (var i = 1; i <= self.h; i++) {
			var lastNonZero = 0;
			var line = '';

			for (var j = 1; j <= self.w; j++) {
				if (dumpCells[i] && dumpCells[i][j]) {
					if (self.buzzers(i, j) != 0) {
						if (lastNonZero < j - 1) {
							line += '(' + (j - 1 - lastNonZero) + ') ';
						}
						line += self.buzzers(i, j) + ' ';
						lastNonZero = j;
					}
				}
			}

			if (line != '') {
				result.mundos.mundo.linea.push({'#attributes': {linea: i, compresionDeCeros: 'true'}, '#text': line});
			}
		}
	}

	result.programas = {programa: {'#attributes': {nombre: 'p1'}}};

	result.programas.programa['#attributes'].resultadoEjecucion = self.runtime.state.error ? self.runtime.state.error : 'FIN PROGRAMA';

	return self.serialize(result, 'resultados', 0);
};

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

	self.bagBuzzers = self.startBagBuzzers = buzzers;
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

if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
	exports.World = World;
}
