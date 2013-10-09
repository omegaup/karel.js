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
              editor.getSession().setMode("ace/mode/kareljava");
              return {parser: new kareljava.Parser(), name: 'java'};
            } else if (m[0].toLowerCase() == 'iniciar-programa') {
              editor.getSession().setMode("ace/mode/karelpascal");
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
        console.log(e.message);
        throw e;
    }
  }

  function getSyntax(str) {
    var parser = detectParser(str);
    parser.parser.yy.parseError = parseError;
    return parser;
  }

  function getErrorLocation(parser) {
    // Return an object with the following properties: first_line, last_line,
    // first_column, last_column.
    return parser.lexer.yylloc;
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
  }

  //Preparación del editor
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/chrome");
  editor.getSession().setMode("ace/mode/karelpascal");
  var Range = ace.require("./range").Range;

  var world = $("#world")[0];
  var context = world.getContext('2d');
  var wRender = new WorldRender(context);
  var borrar_zumbadores = false;
  var zumbadores_anterior = 0;
  var fila_evento;
  var columna_evento;
  var mundo = new World(100, 100);
  var mundo_editable = true;
  var linea_actual = null;
  mundo.load(parseWorld($('script#xmlMundo').html()));
  $("#world").attr('width', $("#world").width());
  wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });

  var interval = null;

  function highlightCurrentLine() {
    if (linea_actual != null) {
      editor.session.removeGutterDecoration(linea_actual, "karel-current-line");
    }

    if (mundo.runtime.state.line >= 1) {
      linea_actual = mundo.runtime.state.line;
      editor.session.addGutterDecoration(linea_actual, "karel-current-line");
      editor.gotoLine(linea_actual + 1);
    }
  }

  function step() {
    //Avanza un paso en la ejecución del código
    mundo.runtime.step();

    highlightCurrentLine();

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
      var compiled = syntax.parser.parse(editor.getValue());
      editor.getSession().clearAnnotations();
      $('#mensajes').trigger('info', {'mensaje': 'Programa compilado (sintaxis '+syntax.name+')'});
      return compiled;
    } catch(e) {
      editor.getSession().setAnnotations([{
        row: e.line - 1,
        column: 0,
        text: e.message,
        type: "error"
      }]);
      $('#mensajes').trigger('error', {'mensaje': '<pre>'+e+'</pre> (sintaxis '+syntax.name+')'});
      editor.focus();
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
  });
  $("#mensajes").bind('info', function(event, data){
    var d = new Date();
    $('#mensajes').prepend('<p class="text-info"><strong>['+d.toLocaleString()+']</strong> '+data['mensaje']+'</p>');
  });
  $("#mensajes").bind('success', function(event, data){
    var d = new Date();
    $('#mensajes').prepend('<p class="text-success"><strong>['+d.toLocaleString()+']</strong> '+data['mensaje']+'</p>');
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
      }
      highlightCurrentLine();
      // Aún no se permite editar el mundo, pero se podrá si se regresa a su estado original.
      editor.focus();
      $("#ejecutar").attr('disabled', 'disabled');
      $("#worldclean").removeAttr('disabled');
    }
  });
  $("#save_out").click(function(event){
    var compiled = compile();
    if (compiled != null) {
      $('#ejecutar').trigger('lock');
      mundo.reset();
      mundo.runtime.load(compiled);
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
    editor.setReadOnly(true);
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
    editor.setReadOnly(false);
  });
  $("#ejecutar").click(function(event){
    if($("#ejecutar i").hasClass('icon-play')) {
      if (mundo_editable) {
        var compiled = compile();
        if (compiled != null) {
          $('#ejecutar').trigger('lock');

          mundo.reset();
          mundo.runtime.load(compiled);
          mundo.runtime.addEventListener('call', function(evt){
            $("#pila").prepend('<div class="well well-small">'+evt.function+'() Línea <span class="badge badge-info">'+evt.line+'</span></div>');
          });
          mundo.runtime.addEventListener('return', function(evt){
            var arreglo = $("#pila > div:first-child").remove();
          });
          interval = setInterval(step, $("#retraso_txt").val());
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
        mundo.runtime.addEventListener('call', function(evt){
          $("#pila").prepend('<div class="well well-small">'+evt.function+'() Línea <span class="badge badge-info">'+evt.line+'</span></div>');
        });
        mundo.runtime.addEventListener('return', function(evt){
          var arreglo = $("#pila > div:first-child").remove();
        });
        step();
        $('#paso').removeAttr('disabled');
        $('#worldclean').removeAttr('disabled');
        $('#futuro').removeAttr('disabled');
        $("#ejecutar i").removeClass('icon-pause').addClass('icon-play');
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
    editor.getSession().setMode("ace/mode/karelpascal");
    editor.setValue("iniciar-programa\n    inicia-ejecucion\n        { TODO poner codigo aqui }\n        apagate;\n    termina-ejecucion\nfinalizar-programa", 1);
    editor.focus();
  });
  $("#javasyntax").click(function(event){
    editor.getSession().setMode("ace/mode/kareljava");
    editor.setValue("class program {\n    program () {\n        // TODO poner codigo aqui\n        turnoff();\n    }\n}", 1);
    editor.focus();
  });
  $("#retraso_minus").click(function(){
    var valor = $("#retraso_txt").val()*1;
    if(valor > 50){
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
    if(valor < 50 || valor > 1000) {
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
        if (!f.type.match('text.*')) {
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
        if (!f.type.match('text.*')) {
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
      editor.session.removeGutterDecoration(linea_actual, "karel-current-line");
    }

    $('#ejecutar').trigger('unlock');
    $("#pila").html('');
    mundo.load(parseWorld($('script#xmlMundo').html()));
    wRender.paint(mundo, world.width, world.height, { editable: true, track_karel: true });
    if ($('#posicion_karel').hasClass('active') != mundo.getDumps(World.DUMP_POSITION)) {
      $('#posicion_karel').button('toggle');
    }
    if ($('#orientacion_karel').hasClass('active') != mundo.getDumps(World.DUMP_ORIENTATION)) {
      $('#orientacion_karel').button('toggle');
    }
  });
  $("#newworld").click(function(event){
    if (linea_actual != null) {
      editor.session.removeGutterDecoration(linea_actual, "karel-current-line");
    }

    $('#ejecutar').trigger('unlock');
    mundo = new World(100, 100);
    wRender.paint(mundo, world.width, world.height, { editable: true, track_karel: true });
    $("#xmlMundo").html(mundo.save());
    if ($('#posicion_karel').hasClass('active')) {
      $('#posicion_karel').button('toggle');
    }
    if ($('#orientacion_karel').hasClass('active')) {
      $('#orientacion_karel').button('toggle');
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
    var x = event.offsetX ||
            (event.clientX + document.body.scrollLeft +
             document.documentElement.scrollLeft - $('#world').offset().left);
    var y = event.offsetY ||
            (event.clientY + document.body.scrollTop +
             document.documentElement.scrollTop - $('#world').offset().top);
    //Maneja los clicks en el mundo
    if ((world.width-50)<=x && x <=(world.width-20) && 10<=y && y<=40) {
        //NORTE
        if (wRender.primera_fila+wRender.num_filas-2 < 100)
            wRender.primera_fila += 1
    } else if ((world.width-50)<=x && x<=(world.width-20) && 80<=y && y<=110) {
        //SUR
        if (wRender.primera_fila > 1)
            wRender.primera_fila -= 1
    } else if ((world.width-50+17)<=x && x<=(world.width-20+17) && 45<=y && y<=75) {
        //ESTE
        if (wRender.primera_columna+wRender.num_columnas-2 < 100)
            wRender.primera_columna += 1
    } else if ((world.width-50+17-35)<=x && x<=(world.width-20+17-35) && 45<=y && y<=75) {
        //OESTE
        if (wRender.primera_columna > 1)
            wRender.primera_columna -= 1
    } else { //Pasan otras cosas
        if(mundo_editable) {
            columna = Math.floor(x/30) + wRender.primera_columna-1
            fila = Math.floor((world.height-y)/30) + wRender.primera_fila-1

            excedente_horizontal = x/30 - Math.floor(x/30)
            excedente_vertical = (world.height-y)/30 - Math.floor((world.height-y)/30)

            if (0<fila && fila<101 && 0<columna && columna<101) {
                if (.25<excedente_horizontal && excedente_horizontal<.75 && .25<excedente_vertical && excedente_horizontal<.75) {
                    if (borrar_zumbadores) {
                        mundo.setBuzzers(fila, columna, 0);
                    } if (event.shiftKey) {
                        mundo.toggleDumpCell(fila, columna);
                    } else {
                        zumbadores = mundo.buzzers(fila, columna);
                        if (zumbadores >= 0 && !event.ctrlKey)
                            mundo.setBuzzers(fila, columna, zumbadores+1);
                        else if (zumbadores > 0 && event.ctrlKey)
                            mundo.setBuzzers(fila, columna, zumbadores-1);
                    }
                } else if (excedente_horizontal > excedente_vertical) {
                    if (excedente_horizontal > (1 - excedente_vertical))
                        mundo.toggleWall(fila, columna, 2)
                    else
                        mundo.toggleWall(fila, columna, 3) //sur
                } else {
                    if (excedente_horizontal > (1 - excedente_vertical))
                        mundo.toggleWall(fila, columna, 1) //norte
                    else
                        mundo.toggleWall(fila, columna, 0)
                }
            }
            $("#xmlMundo").html(mundo.save());
        }
    }
    //Volvemos a pintar el canvas
    wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
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
  $("#world").bind("contextmenu", function(e){
    //Maneja el click derecho sobre el mundo
    if(mundo_editable) {
      var x = event.pageX;
      var y = event.pageY;

      columna_evento = Math.floor(event.offsetX/30) + wRender.primera_columna-1;
      fila_evento = Math.floor((world.height-event.offsetY)/30) + wRender.primera_fila-1;

      $("#wcontext_menu").css("top", y+"px");
      $("#wcontext_menu").css("left", x+"px");
      $("#wcontext_menu").css("display", "block");
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
  $("#posicion_karel").click(function(event){
    mundo.toggleDumps(World.DUMP_POSITION);
    $("#xmlMundo").html(mundo.save());
  });
  $("#orientacion_karel").click(function(event){
    mundo.toggleDumps(World.DUMP_ORIENTATION);
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
  $('#world').hammer().on("drag", function(event) {
    event.gesture.preventDefault();
    var x = event.gesture.deltaX%2;
    var y = event.gesture.deltaY%2;

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
  $('#importar').submit(function(event) {
    var mdo = $('#importar_mdo')[0].files[0];
    var mdoReader = new FileReader();
    mdoReader.onload = (function(mdoReader) {
      return function(e) {
        var kec = $('#importar_kec')[0].files[0];
        var kecReader = new FileReader();
        kecReader.onload = (function(kecReader, mdo) {
          return function(e) {
            mundo.import(new Uint16Array(mdo, 0, mdo.length),
                         new Uint16Array(kecReader.result, 0, kecReader.result.length));
            wRender.paint(mundo, world.width, world.height, { editable: mundo_editable });
            $("#xmlMundo").html(mundo.save());
            $('#importar_modal').modal('hide');
          };
        })(kecReader, mdoReader.result);
        kecReader.readAsArrayBuffer(kec);
      };
    })(mdoReader);
    mdoReader.readAsArrayBuffer(mdo);
    return false;
  });
});
