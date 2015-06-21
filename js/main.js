$(document).ready(function(){
  function detectParser(str) {
    var rules = [
      /^\s+/,
      /^\/\/[^\n]*/,
      /^#[^\n]*/,
      /^(?:\/\*(?:[^*]|\*[^)])*\*\/)/,
      /^{[^}]*}/,
      /^\(\*([^*]|\*[^)])*\*\)/,
      /^[^a-zA-Z0-9_-]+/,
      /^[a-zA-Z0-9_-]+/
    ];
    var i = 0;

    while (i < str.length) {
      for (var j = 0; j < rules.length; j++) {
        var m = rules[j].exec(str.substring(i));
        if (m !== null) {
          if (j == rules.length - 1) {
            // el primer token de verdad.
            if (m[0] == 'class') {
              //editor.getSession().setMode("ace/mode/kareljava");
              return {parser: new kareljava.Parser(), name: 'java'};
            } else if (m[0].toLowerCase() == 'iniciar-programa') {
              ///editor.getSession().setMode("ace/mode/karelpascal");
              return {parser: new karelpascal.Parser(), name: 'pascal'};
            } else {
              return {parser: new karelruby.Parser(), name: 'ruby'};
            }
          } else {
            // comentario o no-token.
            i += m[0].length;
            break;
          }
        }
      }
    }

    return {parser: new karelruby.Parser(), name: 'ruby'};
  }

  function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
      var e = new Error(str);
      for (var n in hash) {
        if (hash.hasOwnProperty(n)) {
          e[n] = hash[n];
        }
      }
      e.text = e.text || this.yy.lexer.upcomingInput();
      var line = editor.getLine(e.line);
      var i = line.indexOf(e.text, this.yy.lexer.yylloc.first_column);
      if (i == -1) {
        i = line.indexOf(e.text);
      }
      if (i != -1) {
        e.loc = {
          first_line: e.line,
          last_line: e.line,
          first_column: i,
          last_column: i + e.text.length
        };
      } else {
        e.loc = {
          first_line: e.line,
          last_line: e.line+1,
          first_column: 0,
          last_column: 0
        };
      }
      throw e;
    }
  }

  function addEventListeners(world) {
      world.runtime.addEventListener('call', function(evt){
          $("#pila").prepend('<div class="well well-small">' + evt.function +
            '(' + evt.param + ') Línea <span class="badge badge-info">'+(evt.line+1)+'</span></div>');
      });
      world.runtime.addEventListener('return', function(evt){
          var arreglo = $("#pila > div:first-child").remove();
      });
      world.runtime.addEventListener('start', function(evt){
          var arreglo = $("#pila > div:first-child").remove();
      });
  }

  function getSyntax(str) {
    var parser = detectParser(str);
    parser.parser.yy.parseError = parseError;
    return parser;
  }

  function parseWorld(xml) {
    // Parses the xml and returns a document object.
    return new DOMParser().parseFromString(xml, 'text/xml');
  }

  function htmlEscape(s) {
    return s.replace(/</g, '&lt;').replace(/</g, '&gt;');
  }

  var ERROR_CODES = {
    'WALL': 'Karel ha chocado con un muro!',
    'WORLDUNDERFLOW': 'Karel intentó tomar zumbadores en una posición donde no había!',
    'BAGUNDERFLOW': 'Karel intentó dejar un zumbador pero su mochila estaba vacía!',
    'INSTRUCTION LIMIT': 'Karel ha superado el límite de instrucciones!',
    'STACK': 'La pila de karel se ha desbordado!'
  };

  var ERROR_TOKENS = {
    pascal: {
      BEGINPROG:'"iniciar-programa"',
      BEGINEXEC:'"inicia-ejecucion"',
      ENDEXEC:'"termina-ejecucion"',
      ENDPROG:'"finalizar-programa"',
      DEF:'"define-nueva-instruccion"',
      PROTO:'"define-prototipo-instruccion"',
      RET:'"sal-de-instruccion"',
      AS:'"como"',
      HALT:'"apagate"',
      LEFT:'"gira-izquierda"',
      FORWARD:'"avanza"',
      PICKBUZZER:'"coge-zumbador"',
      LEAVEBUZZER:'"deja-zumbador"',
      BEGIN:'"inicio"',
      END:'"fin"',
      THEN:'"entonces"',
      WHILE:'"mientras"',
      DO:'"hacer"',
      REPEAT:'"repetir"',
      TIMES:'"veces"',
      DEC:'"precede"',
      INC:'"sucede"',
      IFZ:'"si-es-cero"',
      IFNFWALL:'"frente-libre"',
      IFFWALL:'"frente-bloqueado"',
      IFNLWALL:'"izquierda-libre"',
      IFLWALL:'"izquierda-bloqueada"',
      IFNRWALL:'"derecha-libre"',
      IFRWALL:'"derecha-bloqueada"',
      IFWBUZZER:'"junto-a-zumbador"',
      IFNWBUZZER:'"no-junto-a-zumbador"',
      IFBBUZZER:'"algun-zumbador-en-la-mochila"',
      IFNBBUZZER:'"ningun-zumbador-en-la-mochila"',
      IFN:'"orientado-al-norte"',
      IFS:'"orientado-al-sur"',
      IFE:'"orientado-al-este"',
      IFW:'"orientado-al-oeste"',
      IFNN:'"no-orientado-al-norte"',
      IFNS:'"no-orientado-al-sur"',
      IFNE:'"no-orientado-al-este"',
      IFNW:'"no-orientado-al-oeste"',
      ELSE:'"sino"',
      IF:'"si"',
      NOT:'"no"',
      OR:'"o"',
      AND:'"y"',
      '(':'"("',
      ')':'")"',
      ';':'";"',
      NUM:'un número',
      VAR:'un nombre',
      EOF:'el final del programa'
    },
  };

  //Preparación del editor
  var editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
      lineNumbers: true,
      styleActiveLine: true,
      viewportMargin: Infinity,
      mode: 'karelpascal',
      theme: 'karel',
      foldGutter: {
          rangeFinder: CodeMirror.fold.indent,
      },
      gutters: ['CodeMirror-foldgutter', 'errors', 'breakpoints', 'CodeMirror-linenumbers'],
  });
  editor.on('gutterClick', function(instance, line, gutter, clickEvent) {
      if (gutter == 'CodeMirror-foldgutter') return;
      function makeBreakpoint() {
          var marker = document.createElement('div');
          marker.style.color = '#822';
          marker.innerHTML = '●';
          return marker;
      }
      var markers = instance.lineInfo(line).gutterMarkers;
      instance.setGutterMarker(line, 'breakpoints', (markers && markers.breakpoints) ? null : makeBreakpoint());
  });
	function validatorCallbacks(message) {
		if (message.type == 'error') {
			$('#mensajes').trigger('error', {mensaje: message.message});
		} else if (message.type == 'info') {
			$('#mensajes').trigger('info', {mensaje: message.message});
		} else if (message.type == 'invalidCell') {
			$('#mensajes').trigger('error', {mensaje: 'La celda (' + message.x + ', ' + message.y + ') es inválida'});
		} else {
			console.error('Mensaje no reconocido', message);
		}
	}

  var world = $("#world")[0];
  var context = world.getContext('2d');
  var wRender = new WorldRender(context);
  var borrar_zumbadores = false;
  var zumbadores_anterior = 0;
  var fila_evento;
  var columna_evento;
  var mundo = new World(100, 100);
  addEventListeners(mundo);
  var mundo_editable = true;
  var linea_actual = null;
  var tab_actual = 'mensajes';
  var mensajes_no_leidos = 0;
  var currentCell = undefined;
  $('a[data-toggle="tab"]').on('shown', function(e) {
    tab_actual = e.target.firstChild.nodeValue.toLowerCase().trim();
    if (tab_actual == 'mensajes') {
      mensajes_no_leidos = 0;
      $('#mensajes_cuenta').html('');
    }
  });
  var src = null;
  if (document.location.hash.indexOf('#mundo:') === 0) {
    src = decodeURIComponent(document.location.hash.substring(7));
  } else {
    src = $('script#xmlMundo').html();
  }
  mundo.load(parseWorld(src));
  $("#world").attr('width', $("#world").width());
  wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });

  var interval = null;

  function highlightCurrentLine() {
    if (linea_actual != null) {
      editor.removeLineClass(linea_actual, 'background', 'karel-current-line');
    }

    if (mundo.runtime.state.line >= 1) {
      linea_actual = mundo.runtime.state.line;
      editor.addLineClass(linea_actual, 'background', 'karel-current-line');
      editor.setCursor({line: linea_actual, ch: 0});
    }
  }

  function step() {
    //Avanza un paso en la ejecución del código
    mundo.runtime.step();

    highlightCurrentLine();

    var markers = editor.lineInfo(linea_actual).gutterMarkers;

    if (markers && markers.breakpoints && interval) {
      $('#mensajes').trigger('info', {'mensaje': 'Breakpoint en la línea '+(linea_actual + 1)});
      clearInterval(interval);
      interval = null;
      $("#ejecutar i").removeClass('icon-pause').addClass('icon-play');
      $('#worldclean').removeAttr('disabled');
      $('#paso').removeAttr('disabled');
      $('#futuro').removeAttr('disabled');
    }

    if (mundo.dirty) {
      mundo.dirty = false;
      wRender.paint(mundo, world.width, world.height, { track_karel: true });
    }

    if (!mundo.runtime.state.running) {
      clearInterval(interval);
      interval = null;
      if(mundo.runtime.state.error) {
        $("#mensajes").trigger('error', {mensaje: ERROR_CODES[mundo.runtime.state.error]});
      } else {
        $("#mensajes").trigger('success', {mensaje: 'Ejecución terminada!'});
				mundo.postValidate(validatorCallbacks).then(function (didValidation) {
					if (didValidation) {
						$('#mensajes').trigger('success', {'mensaje': 'La solución es correcta' });
					}
				}, function(message) {
					$('#mensajes').trigger('error', {'mensaje': 'La solución es incorrecta' + (message ? ': ' + message : '') });
				});
      }
      highlightCurrentLine();
      // Aún no se permite editar el mundo, pero se podrá si se regresa a su estado original.
      $("#ejecutar").attr('disabled', 'disabled');
      $("#worldclean").removeAttr('disabled');
    }
  }

  function compile() {
    var syntax = getSyntax(editor.getValue());
    $("#pila").html('');
    try {
      editor.clearGutter('errors');
      var allMarks = editor.getAllMarks();
      for (var i = 0; i < allMarks.length; i++) {
          allMarks[i].clear();
      }
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').trigger('info', {'mensaje': 'Programa compilado (sintaxis '+syntax.name+')'});
      return compiled;
    } catch(e) {
        if (e.expected) {
            e.message = 'Error de compilación en la línea ' + (e.line+1) + ': "' + e.text + '"\n' +
                'Se encontró ' + ERROR_TOKENS.pascal[e.token] + ', se esperaba uno de:';
            for (var i = 0; i < e.expected.length; i++) {
                e.message += ' ' + ERROR_TOKENS.pascal[e.expected[i].substring(1, e.expected[i].length - 1)];
            }
        } else {
            var translations = {
                'Prototype redefinition': 'El prototipo ya había sido declarado',
                'Function redefinition': 'La función ya había sido definida',
                'Function parameter mismatch': 'El número de parámetros de la llamada a función no coincide con el de su declaración',
                'Prototype parameter mismatch': 'El número de parámetros de la función no coincide con el de su prototipo',
                'Unknown function': 'Función desconocida',
                'Undefined function': 'Función no definida',
                'Unknown variable': 'Variable desconocida'
            };
	    if (typeof e === "string") {
		    var message = e;
		    e = new Error(e);
		    e.text = message.split(':')[1];
		    e.line = 0;
		    e.loc = {
			    first_line: 0,
			    last_line: 0
		    };
		    console.log(e);
	    }
            var message = e.message.split(':')[0];
            e.message = 'Error de compilación en la línea ' + (e.line+1) + '\n' +
                translations[message] + ': "' + e.text + '"';
        }
        var marker = document.createElement('div');
        marker.className = 'error';
        marker.style.position = 'relative';
        marker.innerHTML = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUM2OEZDQTQ4RTU0MTFFMUEzM0VFRTM2RUY1M0RBMjYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUM2OEZDQTU4RTU0MTFFMUEzM0VFRTM2RUY1M0RBMjYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBQzY4RkNBMjhFNTQxMUUxQTMzRUVFMzZFRjUzREEyNiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBQzY4RkNBMzhFNTQxMUUxQTMzRUVFMzZFRjUzREEyNiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PkgXxbAAAAJbSURBVHjapFNNaBNBFH4zs5vdZLP5sQmNpT82QY209heh1ioWisaDRcSKF0WKJ0GQnrzrxasHsR6EnlrwD0TagxJabaVEpFYxLWlLSS822tr87m66ccfd2GKyVhA6MMybgfe97/vmPUQphd0sZjto9XIn9OOsvlu2nkqRzVU+6vvlzPf8W6bk8dxQ0NPbxAALgCgg2JkaQuhzQau/El0zbmUA7U0Es8v2CiYmKQJHGO1QICCLoqilMhkmurDAyapKgqItezi/USRdJqEYY4D5jCy03ht2yMkkvL91jTTX10qzyyu2hruPRN7jgbH+EOsXcMLgYiThEgAMhABW85oqy1DXdRIdvP1AHJ2acQXvDIrVHcdQNrEKNYSVMSZGMjEzIIAwDXIo+6G/FxcGnzkC3T2oMhLjre49sBB+RRcHLqdafK6sYdE/GGBwU1VpFNj0aN8pJbe+BkZyevUrvLl6Xmm0W9IuTc0DxrDNAJd5oEvI/KRsNC3bQyNjPO9yQ1YHcfj2QvfQc/5TUhJTBc2iM0U7AWDQtc1nJHvD/cfO2s7jaGkiTEfa/Ep8coLu7zmNmh8+dc5lZDuUeFAGUNA/OY6JVaypQ0vjr7XYjUvJM37vt+j1vuTK5DgVfVUoTjVe+y3/LxMxY2GgU+CSLy4cpfsYorRXuXIOi0Vt40h67uZFTdIo6nLaZcwUJWAzwNS0tBnqqKzQDnjdG/iPyZxo46HaKUpbvYkj8qYRTZsBhge+JHhZyh0x9b95JqjVJkT084kZIPwu/mPWqPgfQ5jXh2+92Ay7HedfAgwA6KDWafb4w3cAAAAASUVORK5CYII=" width="16" height="16"/><pre class="error-popup">' + e.message + '</pre>';
        editor.setGutterMarker(e.line, 'errors', marker);
        var first = {line: e.loc.first_line, ch: e.loc.first_column};
        var last = {line: e.loc.last_line, ch: e.loc.last_column};
        var options = {title: e.message, className: 'parse-error'};
        var mark = editor.markText(first, last, options);
      $('#mensajes').trigger('error', {'mensaje': '<pre>'+e+'</pre> (sintaxis '+syntax.name+')'});
      return null;
    }
  }

  $(window).resize(function(event) {
    $("#world").attr('width', $("#world").width());
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
  });
  $("#mensajes").bind('error', function(event, data){
    var d = new Date();
    $('#mensajes').prepend('<p class="text-error"><strong>['+d.toLocaleString()+']</strong> '+data['mensaje']+'</p>');
    if (tab_actual != 'mensajes') {
      mensajes_no_leidos++;
      $('#mensajes_cuenta').html('<span class="badge badge-info">'+mensajes_no_leidos+'</span>');
    }
  });
  $("#mensajes").bind('info', function(event, data){
    var d = new Date();
    $('#mensajes').prepend('<p class="text-info"><strong>['+d.toLocaleString()+']</strong> '+data['mensaje']+'</p>');
    if (tab_actual != 'mensajes') {
      mensajes_no_leidos++;
      $('#mensajes_cuenta').html('<span class="badge badge-info">'+mensajes_no_leidos+'</span>');
    }
  });
  $("#mensajes").bind('success', function(event, data){
    var d = new Date();
    $('#mensajes').prepend('<p class="text-success"><strong>['+d.toLocaleString()+']</strong> '+data['mensaje']+'</p>');
    if (tab_actual != 'mensajes') {
      mensajes_no_leidos++;
      $('#mensajes_cuenta').html('<span class="badge badge-info">'+mensajes_no_leidos+'</span>');
    }
  });
  $("#compilar").click(function(event){
    compile();
    editor.focus();
  });
  $("#futuro").click(function(event){
    var compiled = compile();
    if (compiled != null) {
      $('#ejecutar').trigger('lock');
      mundo.reset();
      mundo.runtime.load(compiled);
			mundo.preValidate(validatorCallbacks).then(function (didValidation) {
				if (didValidation) {
					$('#mensajes').trigger('success', {'mensaje': 'La validación fue exitosa' });
				}
				mundo.runtime.start();
				var finished = false;
				mundo.runtime.disableStackEvents = true;
				for (var i = 0; i < 1000000; i++) {
					if (!mundo.runtime.step()) {
						finished = true;
						break;
					}
				}
				mundo.runtime.disableStackEvents = false;
				if (!finished) {
					mundo.runtime.state.error = 'INSTRUCTION LIMIT';
				}
				wRender.paint(mundo, world.width, world.height, { track_karel: true });
				if(mundo.runtime.state.error) {
					$("#mensajes").trigger('error', {mensaje: ERROR_CODES[mundo.runtime.state.error]});
				} else {
					$("#mensajes").trigger('success', {mensaje: 'Ejecución terminada!'});
					mundo.postValidate(validatorCallbacks).then(function (didValidation) {
						if (didValidation) {
							$('#mensajes').trigger('success', {'mensaje': 'La solución es correcta' });
						}
					}, function(message) {
						$('#mensajes').trigger('error', {'mensaje': 'La solución es incorrecta' + (message ? ': ' + message : '') });
					});
				}
				highlightCurrentLine();
				// Aún no se permite editar el mundo, pero se podrá si se regresa a su estado original.
				editor.focus();
				$("#ejecutar").attr('disabled', 'disabled');
				$("#worldclean").removeAttr('disabled');
			}, function(message) {
				$('#mensajes').trigger('error', {'mensaje': 'La validación falló' + (message ? ': ' + message : '') });
				compiled = null;
				$('#ejecutar').trigger('unlock');
			});
    }
  });
  $("#save_out").click(function(event){
    var compiled = compile();
    if (compiled != null) {
      $('#ejecutar').trigger('lock');
      mundo.reset();
      mundo.runtime.load(compiled);
      mundo.runtime.start();
      var finished = false;
      for (var i = 0; i < 1000000; i++) {
        if (!mundo.runtime.step()) {
          finished = true;
          break;
        }
      }
      if (!finished) {
        mundo.runtime.state.error = 'INSTRUCTION LIMIT';
      }
      wRender.paint(mundo, world.width, world.height, { track_karel: true });
      if(mundo.runtime.state.error) {
        $("#mensajes").trigger('error', {mensaje: ERROR_CODES[mundo.runtime.state.error]});
      } else {
        $("#mensajes").trigger('success', {mensaje: 'Ejecución terminada!'});
				mundo.postValidate(validatorCallbacks).then(function (didValidation) {
					if (didValidation) {
						$('#mensajes').trigger('success', {'mensaje': 'La solución es correcta' });
					}
				}, function(message) {
					$('#mensajes').trigger('error', {'mensaje': 'La solución es incorrecta' + (message ? ': ' + message : '') });
				});
      }
      highlightCurrentLine();
      // Aún no se permite editar el mundo, pero se podrá si se regresa a su estado original.
      editor.focus();
      $("#ejecutar").attr('disabled', 'disabled');
      $("#worldclean").removeAttr('disabled');
      $('#guardar_salida').html(htmlEscape(mundo.output()));
      var blob = new Blob([mundo.output()], {'type':'text/xml'});
      $('#guardar_descargar')
        .attr('href', window.URL.createObjectURL(blob))
        .attr('download', 'mundo.out');
    }
  });
  $("#ejecutar").bind('lock', function(evt){
    //Bloquea los controles de ejecución y edición
    mundo_editable = false; //Previene ediciones del mundo
    $("#futuro").attr('disabled', 'disabled');
    $("#quitar_zumbadores").attr('disabled', 'disabled');
    $("#mochila").attr('disabled', 'disabled');
    $("#inf_zumbadores").attr('disabled', 'disabled');
    $("#paso").attr('disabled', 'disabled');
    $("#worldclean").attr('disabled', 'disabled');
    $("#ejecutar i").removeClass('icon-play').addClass('icon-pause');
    $("#posicion_karel").attr('disabled', 'disabled');
    $("#orientacion_karel").attr('disabled', 'disabled');
    $("#mochila_karel").attr('disabled', 'disabled');
    editor.setOption('readOnly', true);
  });
  $("#ejecutar").bind('unlock', function(evt){
    //Desbloquea los controles de ejecución
    mundo_editable = true; //Previene ediciones del mundo
    $("#ejecutar").removeAttr('disabled');
    $("#futuro").removeAttr('disabled');
    $("#quitar_zumbadores").removeAttr('disabled');
    $("#mochila").removeAttr('disabled');
    $("#inf_zumbadores").removeAttr('disabled');
    $("#paso").removeAttr('disabled');
    $("#worldclean").removeAttr('disabled');
    $("#ejecutar").removeAttr('disabled');
    $("#ejecutar i").removeClass('icon-pause').addClass('icon-play');
    $("#posicion_karel").removeAttr('disabled');
    $("#orientacion_karel").removeAttr('disabled');
    $("#mochila_karel").removeAttr('disabled');
    editor.setOption('readOnly', false);
  });
  $("#ejecutar").click(function(event){
    if($("#ejecutar i").hasClass('icon-play')) {
      if (mundo_editable) {
        var compiled = compile();
        if (compiled != null) {
          $('#ejecutar').trigger('lock');

          mundo.reset();
          mundo.runtime.load(compiled);
					mundo.preValidate(validatorCallbacks).then(function (didValidation) {
						if (didValidation) {
							$('#mensajes').trigger('success', {'mensaje': 'La validación fue exitosa' });
						}
						mundo.runtime.start();
						interval = setInterval(step, $("#retraso_txt").val());
					}, function(message) {
						$('#mensajes').trigger('error', {'mensaje': 'La validación falló' + (message ? ': ' + message : '') });
						$('#ejecutar').trigger('unlock');
						compiled = null;
					});
        }
      } else {
        $('#ejecutar').trigger('lock');
        interval = setInterval(step, $("#retraso_txt").val());
      }
    } else {
      clearInterval(interval);
      $("#ejecutar i").removeClass('icon-pause').addClass('icon-play');
      $('#worldclean').removeAttr('disabled');
      $('#paso').removeAttr('disabled');
      $('#futuro').removeAttr('disabled');
    }
  });
  $('#paso').click(function(event){
    if (mundo_editable) {
      var compiled = compile();
      if (compiled != null) {
        $('#ejecutar').trigger('lock');

        mundo.reset();
        mundo.runtime.load(compiled);
				mundo.preValidate(validatorCallbacks).then(function (didValidation) {
					if (didValidation) {
						$('#mensajes').trigger('success', {'mensaje': 'La validación fue exitosa' });
					}
					mundo.runtime.start();
					step();
					$('#paso').removeAttr('disabled');
					$('#worldclean').removeAttr('disabled');
					$('#futuro').removeAttr('disabled');
					$("#ejecutar i").removeClass('icon-pause').addClass('icon-play');
				}, function(message) {
					$('#mensajes').trigger('error', {'mensaje': 'La validación falló' + (message ? ': ' + message : '') });
					$('#ejecutar').trigger('unlock');
					compiled = null;
				});
      }
    } else {
      step();
    }
  });
  $("#rubysyntax").click(function(event){
    editor.setValue("#TODO poner codigo aqui");
    editor.focus();
  });
  $("#pascalsyntax").click(function(event){
    //editor.getSession().setMode("ace/mode/karelpascal");
    editor.setValue("iniciar-programa\n    inicia-ejecucion\n        { TODO poner codigo aqui }\n        apagate;\n    termina-ejecucion\nfinalizar-programa", 1);
    editor.focus();
  });
  $("#javasyntax").click(function(event){
    //editor.getSession().setMode("ace/mode/kareljava");
    editor.setValue("class program {\n    program () {\n        // TODO poner codigo aqui\n        turnoff();\n    }\n}", 1);
    editor.focus();
  });
  $("#retraso_minus").click(function(){
    var valor = $("#retraso_txt").val()*1;
    if(valor >= 50){
      valor -= 50;
      $("#retraso_txt").val(valor);
      if (interval) {
        clearInterval(interval);
        interval = setInterval(step, $("#retraso_txt").val());
      }
    }
  });
  $("#retraso_plus").click(function(){
    var valor = $("#retraso_txt").val()*1;
    if(valor < 1000){
      valor += 50;
      $("#retraso_txt").val(valor);
      if (interval) {
        clearInterval(interval);
        interval = setInterval(step, $("#retraso_txt").val());
      }
    }
  });
  $("#retraso_txt").blur(function(event){
    var valor = $("#retraso_txt").val()*1;
    if(valor < 0 || valor > 1000) {
      $("#retraso_txt").val(500);
      if (interval) {
        clearInterval(interval);
        interval = setInterval(step, $("#retraso_txt").val());
      }
    }
  });
  $("#mochila").blur(function(event){
    mundo.setBagBuzzers($('#mochila').val());
    $("#xmlMundo").html(mundo.save());
  });
  $("#codeload").click(function(event){
    var file = document.createElement('input');
    file.type = 'file';
    file.addEventListener('change', function(evt) {
      var files = evt.target.files; // FileList object

      // Loop through the FileList and render image files as thumbnails.
      for (var i = 0, f; f = files[i]; i++) {
        // Only process text files.
        if (f.type && !(f.type.match('text.*') || f.type == 'application/javascript')) {
          continue;
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
          return function(e) {
            editor.setValue(reader.result);
          };
        })(f);

        // Read in the file as a data URL.
        reader.readAsText(f);
      }
    });
    file.click();
  });
  $("#codesave").click(function(event){
    $('#guardar_modal').modal('show');
    $('#guardar_salida').html(htmlEscape(editor.getValue()));
    var blob = new Blob([editor.getValue()], {'type':'text/xml'});
    $('#guardar_descargar')
      .attr('href', window.URL.createObjectURL(blob))
      .attr('download', 'karel.txt');
  });
  $("#worldload").click(function(event){
    var file = document.createElement('input');
    file.type = 'file';
    file.addEventListener('change', function(evt) {
      var files = evt.target.files; // FileList object

      // Loop through the FileList and render image files as thumbnails.
      for (var i = 0, f; f = files[i]; i++) {
        // Only process text files.
        if (f.type && !f.type.match('text.*')) {
          continue;
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
          return function(e) {
            $('script#xmlMundo').html(reader.result);
            $('#worldclean').click();
          };
        })(f);

        // Read in the file as a data URL.
        reader.readAsText(f);
      }
    });
    file.click();
  });
  $("#worldsave").click(function(event){
    $('#guardar_modal').modal('show');
    $('#guardar_salida').html(htmlEscape($('script#xmlMundo').html()));
    var blob = new Blob([$('script#xmlMundo').html()], {'type':'text/xml'});
    $('#guardar_descargar')
      .attr('href', window.URL.createObjectURL(blob))
      .attr('download', 'mundo.in');
  });
  $("#worldclean").click(function(event){
    if (linea_actual != null) {
      editor.removeLineClass(linea_actual, 'background', 'karel-current-line');
    }

    $('#ejecutar').trigger('unlock');
    $("#pila").html('');
    var src = null;
    if (document.location.hash.indexOf('#mundo:') === 0) {
      src = decodeURIComponent(document.location.hash.substring(7));
    } else {
      src = $('script#xmlMundo').html();
    }
    mundo.load(parseWorld(src));
    if (mundo.bagBuzzers == -1 != $('#inf_zumbadores').hasClass('active')) {
        $('#inf_zumbadores').toggleClass('active');
    }
    if (mundo.bagBuzzers == -1) {
        $('#mochila').val('').attr('disabled', 'disabled');
    } else {
        $('#mochila').val(mundo.bagBuzzers).removeAttr('disabled');
    }
    wRender.paint(mundo, world.width, world.height, { editable: true, track_karel: true });
    if ($('#posicion_karel').hasClass('active') != mundo.getDumps(World.DUMP_POSITION)) {
      $('#posicion_karel').button('toggle');
    }
    if ($('#orientacion_karel').hasClass('active') != mundo.getDumps(World.DUMP_ORIENTATION)) {
      $('#orientacion_karel').button('toggle');
    }
    if ($('#mochila_karel').hasClass('active') != mundo.getDumps(World.DUMP_BAG)) {
      $('#mochila_karel').button('toggle');
    }
  });
  $("#newworld").click(function(event){
    if (linea_actual != null) {
      editor.removeLineClass(linea_actual, 'background', 'karel-current-line');
    }

    $('#ejecutar').trigger('unlock');
    mundo = new World(100, 100);
    addEventListeners(mundo);
    wRender.paint(mundo, world.width, world.height, { editable: true, track_karel: true });
    $("#xmlMundo").html(mundo.save());
    if ($('#posicion_karel').hasClass('active')) {
      $('#posicion_karel').button('toggle');
    }
    if ($('#orientacion_karel').hasClass('active')) {
      $('#orientacion_karel').button('toggle');
    }
    if ($('#mochila_karel').hasClass('active')) {
      $('#mochila_karel').button('toggle');
    }
  });
  $("body").keyup(function(event){
    if(event.keyCode == 27) {
      $("#wcontext_menu").css("display", "none");
    }
  });
  $("#world").click(function(event){
    $("#wcontext_menu").css("display", "none");
    // Firefox no reconoce offsetX. UGH.
    
    //Maneja los clicks en el mundo
    if ((world.width-50)<=x && x <=(world.width-20) && 10<=y && y<=40) {
        wRender.moveNorth();
    } else if ((world.width-50)<=x && x<=(world.width-20) && 80<=y && y<=110) {
        wRender.moveSouth();
    } else if ((world.width-50+17)<=x && x<=(world.width-20+17) && 45<=y && y<=75) {
        wRender.moveEast();
    } else if ((world.width-50+17-35)<=x && x<=(world.width-20+17-35) && 45<=y && y<=75) {
        wRender.moveWest();
    } else if(mundo_editable) {
        if (mundo.isInbounds(currentCell.row,currentCell.column)) {
          
          if (currentCell.kind == Kind.Corner) {
            if (wRender.polygon) {
              var result = wRender.polygonFinish(currentCell.row, currentCell.column);
              if (result) {
                for (var i = result.start_row; i < result.finish_row; i++) {
                  mundo.toggleWall(i, result.start_column, 0); // oeste
                }
                for (var i = result.start_column; i < result.finish_column; i++) {
                  mundo.toggleWall(result.start_row , i, 3); // sur
                }
              }
            }
            wRender.polygonStart(currentCell.row, currentCell.column);
          } else {
            wRender.polygonClear();
            
            if (currentCell.kind == Kind.WestWall) {
              mundo.toggleWall(currentCell.row, currentCell.column, 0); // oeste
            
            }  else if (currentCell.kind == Kind.SouthWall) {
                mundo.toggleWall(currentCell.row, currentCell.column, 3); // sur
            
            } else if (currentCell.kind == Kind.Beeper){
              if (borrar_zumbadores) {
                  mundo.setBuzzers(currentCell.row, currentCell.column, 0);
              } if (event.shiftKey) {
                  mundo.toggleDumpCell(currentCell.row, currentCell.column);
              } else {
                  zumbadores = mundo.buzzers(currentCell.row, currentCell.column);
                  if (zumbadores >= 0 && !event.ctrlKey)
                      mundo.setBuzzers(currentCell.row, currentCell.column, zumbadores+1);
                  else if (zumbadores > 0 && event.ctrlKey)
                      mundo.setBuzzers(currentCell.row, currentCell.column, zumbadores-1);
              }
            }
          }
      }
      //console.log(fila+", "+columna);
      $("#xmlMundo").html(mundo.save());
    }
    //Volvemos a pintar el canvas
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
  });
  $('#world').mousemove(function(event) {
    var x = event.offsetX ||
            (event.clientX + document.body.scrollLeft +
             document.documentElement.scrollLeft - $('#world').offset().left);
    var y = event.offsetY ||
            (event.clientY + document.body.scrollTop +
             document.documentElement.scrollTop - $('#world').offset().top);
    var cellInfo = wRender.calculateCell(x,world.height-y);
    
    changed = !((currentCell) && 
              cellInfo.row == currentCell.row &&
              cellInfo.column == currentCell.column &&
              cellInfo.kind == currentCell.kind);
    currentCell = cellInfo;
    if (mundo_editable && changed) {
      console.log(x + " " + (world.height-y) + " " + JSON.stringify(cellInfo));
      if (mundo.isInbounds(cellInfo.row,cellInfo.column)) {
        wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
        if (cellInfo.kind == Kind.Corner) {
          if (wRender.polygon) {
            wRender.polygonUpdate(cellInfo.row, cellInfo.column);
            wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
          } else {
            wRender.hoverCorner(cellInfo.row, cellInfo.column, world.width, world.height);
          }
        } else {          
          if (cellInfo.kind == Kind.WestWall) {
              wRender.hoverWall(cellInfo.row, cellInfo.column, 0, world.width, world.height); // oeste
          }  else if (cellInfo.kind == Kind.SouthWall) {
              wRender.hoverWall(cellInfo.row, cellInfo.column, 3, world.width, world.height); // sur
          } else if (cellInfo.kind == Kind.Beeper){
              wRender.hoverBuzzer(cellInfo.row, cellInfo.column, world.width, world.height);
          }
        }
      }
    }
  });
  $("#world").bind("contextmenu", function(e){
    // Maneja el click derecho sobre el mundo
    if (mundo_editable) {
      var x = event.pageX;
      var y = event.pageY;

      columna_evento = Math.floor(event.offsetX/wRender.tamano_celda) + wRender.primera_columna-1;
      fila_evento = Math.floor((world.height-event.offsetY)/wRender.tamano_celda) + wRender.primera_fila-1;

      if (y + $('#wcontext_menu').height() > $(window).height()) {
          y -= $('#wcontext_menu').height();
      }
      if (x + $('#wcontext_menu').width() > $(window).width()) {
          x -= $('#wcontext_menu').width();
      }

      $('#wcontext_menu').css({top: y+'px', left: x+'px', display: 'block'});
      return false;
    }
  });
  $("#world")[0].onmousewheel = function(event){
    if(event.wheelDeltaX < 0 && (wRender.primera_columna + wRender.num_columnas)<102) {
      wRender.primera_columna += 1;
    } else if(event.wheelDeltaX > 0 && wRender.primera_columna > 1) {
      wRender.primera_columna -= 1;
    }

    if(event.wheelDeltaY > 0 && (wRender.primera_fila + wRender.num_filas)<102) {
      wRender.primera_fila += 1;
    } else if(event.wheelDeltaY < 0 && wRender.primera_fila > 1) {
      wRender.primera_fila -= 1;
    }

    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    return false;
  };
  $('#world').hammer().on("drag", function(event) {
    event.gesture.preventDefault();
    var x = event.gesture.deltaX % 2;
    var y = event.gesture.deltaY % 2;

    if(event.gesture.deltaX < 0 && (wRender.primera_columna + wRender.num_columnas)<102 && x==0) {
      wRender.primera_columna += 1;
    } else if(event.gesture.deltaX > 0 && wRender.primera_columna > 1 && x==0) {
      wRender.primera_columna -= 1;
    }

    if(event.gesture.deltaY > 0 && (wRender.primera_fila + wRender.num_filas)<102 && y==0) {
      wRender.primera_fila += 1;
    } else if(event.gesture.deltaY < 0 && wRender.primera_fila > 1 && y==0) {
      wRender.primera_fila -= 1;
    }

    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    return false;
  });
  $("#inf_zumbadores").click(function(event){
    if($(this).hasClass('active')) { //ya hay infinitos
      mundo.setBagBuzzers(zumbadores_anterior);
      $("#mochila").val(zumbadores_anterior);
      $(this).removeClass('active');
      $("#mochila").removeAttr('disabled');
    } else { //hay finitos
      zumbadores_anterior = $("#mochila").val();
      mundo.setBagBuzzers(-1);
      $(this).addClass('active');
      $("#mochila").attr('disabled', 1);
    }
    $("#xmlMundo").html(mundo.save());
  });
  $("#quitar_zumbadores").click(function(event){
    if($(this).hasClass('active')) { //ya hay infinitos
      borrar_zumbadores = false;
      $(this).removeClass('active');
    } else { //hay finitos
      borrar_zumbadores = true;
      $(this).addClass('active');
    }
    $("#xmlMundo").html(mundo.save());
  });
  $("#go_home").click(function(event){
    wRender.primera_fila = 1;
    wRender.primera_columna = 1;
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
  });
  $("#follow_karel").click(function(event){
    wRender.primera_fila = mundo.i;
    wRender.primera_columna = mundo.j;
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
  });
  $("#posicion_karel").click(function(event){
    mundo.toggleDumps(World.DUMP_POSITION);
    $("#xmlMundo").html(mundo.save());
  });
  $("#orientacion_karel").click(function(event){
    mundo.toggleDumps(World.DUMP_ORIENTATION);
    $("#xmlMundo").html(mundo.save());
  });
  $("#mochila_karel").click(function(event){
    mundo.toggleDumps(World.DUMP_BAG);
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_norte").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('NORTE');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_sur").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('SUR');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_este").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('ESTE');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_oeste").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('OESTE');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#n_zumbadores").click(function(event){
    mundo.setBuzzers(fila_evento, columna_evento, prompt("¿Cuántos zumbadores?", '0'));
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#inf_zumbadores_ctx").click(function(event){
    mundo.setBuzzers(fila_evento, columna_evento, -1);
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#cero_zumbadores").click(function(event) {
    mundo.setBuzzers(fila_evento, columna_evento, 0);
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $("#toggle_dump_cell").click(function(event) {
    mundo.toggleDumpCell(fila_evento, columna_evento);
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
    $("#xmlMundo").html(mundo.save());
  });
  $('#importar').submit(function(event) {
    var mdo = $('#importar_mdo')[0].files[0];
    var mdoReader = new FileReader();
    mdoReader.onload = (function(mdoReader) {
      return function(e) {
        var kec = $('#importar_kec')[0].files[0];
        var kecReader = new FileReader();
        kecReader.onload = (function(kecReader, mdo) {
          return function(e) {
            $('#worldclean').click();
            mundo.import(new Uint16Array(mdo), new Uint16Array(kecReader.result));
            addEventListeners(mundo);
            wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
            $("#xmlMundo").html(mundo.save());
            $('#importar_modal').modal('hide');
            if ($('#posicion_karel').hasClass('active') != mundo.getDumps(World.DUMP_POSITION)) {
              $('#posicion_karel').button('toggle');
            }
            if ($('#orientacion_karel').hasClass('active') != mundo.getDumps(World.DUMP_ORIENTATION)) {
              $('#orientacion_karel').button('toggle');
            }
            if ($('#mochila_karel').hasClass('active') != mundo.getDumps(World.DUMP_BAG)) {
              $('#mochila_karel').button('toggle');
            }
          };
        })(kecReader, mdoReader.result);
        kecReader.readAsArrayBuffer(kec);
      };
    })(mdoReader);
    mdoReader.readAsArrayBuffer(mdo);
    return false;
  });
  var layoutExpanded = true;
  function recalcDimensions() {
    var x = 0;
    var y = $('#splitterContainer').offset().top;
    var w = $(window).width();
    var h = $(window).height() - y;
    $('#splitterContainer').height(h);
    if (layoutExpanded) {
      $('#leftSplitterContainer').css({position: 'absolute', top: 0, left: 0, width: 550, height: h, display: 'block'});
      $('#leftTopPane').css({position: 'absolute', top: 0, left: 0, width: "100%", height: h * 0.8});
      $('.CodeMirror').css({position: 'absolute', top: 0, left: 0, width: "100%", height: h * 0.8});
      $('#leftBottomPane').css({position: 'absolute', top: '80%', left: 0, width: '100%', height: '20%'});
      $('#mensajes').css({height: 135, overflowY: 'auto'});
      $('#pila').css({height: 135, overflowY: 'auto'});
      $('#rightPane').css({position: 'absolute', top: 0, left: 550 + 8, width: w - 550 - 8, height: h});
      $('#world').css({width: w - 550 - 8, height: h});
      $('#vsplitter').css({position: 'absolute', width: 8, height: h, top: 0, left: 550, cursor: 'w-resize'});
      world.width = w - 550;
      world.height = h;
    } else {
      $('#rightPane').css({position: 'absolute', top: 0, left: 8, width: w - 8, height: h});
      $('#leftSplitterContainer').css({display: 'none'});
      $('#world').css({width: w - 8, height: h});
      $('#vsplitter').css({position: 'absolute', width: 8, height: h, top: 0, left: 0, cursor: 'e-resize'});
      world.width = w - 8;
      world.height = h;
    }
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
  }
  $('#splitterContainer').append(
      $('<div id="vsplitter"></div>')
        .css({background: '#eee url(img/dots.png) center center no-repeat', 'z-index': 100})
        .click(function() {
          layoutExpanded = !layoutExpanded;
          recalcDimensions();
        }));
  recalcDimensions();
  $(window).resize(recalcDimensions);
});
