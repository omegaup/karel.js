$(document).ready(function(){
  function getSyntax(str) {
    var rules = [
      /^\s+/,
      /^\/\/[^\n]*/,
      /^#[^\n]*/,
      /^(?:\/\*(?:[^*]|\*[^)])*\*\/)/,
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
              return {parser: new kareljava.Parser(), name: 'java'};
            } else if (m[0] == 'iniciar-programa') {
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

  function getErrorLocation(parser) {
    // Return an object with the following properties: first_line, last_line,
    // first_column, last_column.
    return parser.lexer.yylloc;
  }

  function parseWorld(xml) {
    // Parses the xml and returns a document object.
    return new DOMParser().parseFromString(xml, 'text/xml');
  }

  var ERROR_CODES = {
    'WALL': 'Karel ha chocado con un muro!',
    'WORLDUNDERFLOW': 'Karel intentó tomar zumbadores en una posición donde no había!',
    'BAGUNDERFLOW': 'Karel intentó dejar un zumbador pero su mochila estaba vacía!'
  }

  //Preparación del editor
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/github");
  editor.getSession().setMode("ace/mode/text");

  var world = $("#world")[0];
  var context = world.getContext('2d');
  var wRender = new WorldRender(context);
  var borrar_zumbadores = false;
  var zumbadores_anterior = 0;
  var fila_evento;
  var columna_evento;
  var mundo = new World(100, 100);
  mundo.load(parseWorld($('script#xmlMundo').html()));
  wRender.paint(mundo, world.width, world.height);

  var interval = null;

  function step() {
    //Avanza un paso en la ejecución del código
    while (!mundo.dirty && mundo.runtime.step());

    mundo.dirty = false;

    wRender.paint(mundo, world.width, world.height, true);

    if (!mundo.runtime.state.running) {
      clearInterval(interval);
      interval = null;
      if(mundo.runtime.state.error) {
        $("#mensajes").trigger('error', {mensaje: ERROR_CODES[mundo.runtime.state.error]});
        alert(ERROR_CODES[mundo.runtime.state.error]);
      } else {
        $("#mensajes").trigger('success', {mensaje: 'Ejecución terminada!'});
        alert('Ejecución terminada!');
      }
    }
  }

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
    var syntax = getSyntax(editor.getValue());
    try {
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').trigger('info', {'mensaje': 'Programa compilado (sintaxis '+syntax.name+')'});
      editor.focus();
    } catch(e) {
      $('#mensajes').trigger('error', {'mensaje': '<pre>'+e+'</pre> (sintaxis '+syntax.name+')'});
      editor.focus();
    }
  });
  $("#futuro").click(function(event){
    var syntax = getSyntax(editor.getValue());
    try {
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').trigger('info', {'mensaje': 'Programa compilado (sintaxis '+syntax.name+')'});

      mundo.reset();
      mundo.runtime.load(compiled);
      while (mundo.runtime.step());
      if(mundo.runtime.state.error) {
        $("#mensajes").trigger('error', {mensaje: ERROR_CODES[mundo.runtime.state.error]});
        alert(ERROR_CODES[mundo.runtime.state.error]);
      } else {
        $("#mensajes").trigger('error', {mensaje: 'Ejecución terminada!'});
        alert('Ejecución terminada!');
      }
      wRender.paint(mundo, world.width, world.height, true);
      editor.focus();
    } catch(e) {
      $('#mensajes').trigger('error', {'mensaje': '<pre>'+e+'</pre> (sintaxis '+syntax.name+')'});
      editor.focus();
    }
  });
  $("#ejecutar").click(function(event){
    var d = new Date();
    var syntax = getSyntax(editor.getValue());
    try {
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').trigger('info', {'mensaje': 'Programa compilado (sintaxis '+syntax.name+')'});

      mundo.reset();
      mundo.runtime.load(compiled);
      mundo.runtime.addEventListener('call', function(evt){
        $("#pila").prepend('<div class="well well-small">'+evt.function+'() Línea <span class="badge badge-info">'+evt.line+'</span></div>');
      });
      mundo.runtime.addEventListener('return', function(evt){
        var arreglo = $("#pila > div");
        arreglo.reverse();
        arreglo.pop();
        arreglo.reverse();
        $("#pila").html(arr);
      });
      interval = setInterval(step, $("#retraso_txt").val());
    } catch(e) {
      $('#mensajes').trigger('error', {'mensaje': '<pre>'+e+'</pre> (sintaxis '+syntax.name+')'});
      editor.focus();
    }
  });
  $("#rubysyntax").click(function(event){
    editor.setValue("#TODO poner codigo aqui");
    editor.focus();
  });
  $("#pascalsyntax").click(function(event){
    editor.setValue("iniciar-programa\n    inicia-ejecucion\n        {TODO poner codigo aqui}\n        apagate;\n    termina-ejecucion\nfinalizar-programa", 1);
    editor.focus();
  });
  $("#javasyntax").click(function(event){
    editor.setValue("class program {\n    program() {\n        //TODO poner codigo aqui\n        turnoff();\n    }\n}", 1);
    editor.focus();
  });
  $("#retraso_minus").click(function(){
    var valor = $("#retraso_txt").val()*1;
    if(valor > 50){
      valor -= 50;
      $("#retraso_txt").val(valor);
    }
  });
  $("#retraso_plus").click(function(){
    var valor = $("#retraso_txt").val()*1;
    if(valor < 1000){
      valor += 50;
      $("#retraso_txt").val(valor);
    }
  });
  $("#retraso_txt").blur(function(event){
    var valor = $("#retraso_txt").val()*1;
    if(valor < 50 || valor > 1000) {
      $("#retraso_txt").val(500);
    }
  });
  $("#mochila").blur(function(event){
      mundo.setBagBuzzers($('#mochila').val());
      $("#xmlMundo").html(mundo.save());
  });
  $("#worldclean").click(function(event){
    mundo.load(parseWorld($('script#xmlMundo').html()));
    wRender.paint(mundo, world.width, world.height, true);
  });
  $("#newworld").click(function(event){
    mundo = new World(100, 100);
    wRender.paint(mundo, world.width, world.height, true);
    $("#xmlMundo").html(mundo.save());
  });
  $("body").keyup(function(event){
    if(event.keyCode == 27) {
      $("#wcontext_menu").css("display", "none");
    }
  });
  $("#world").click(function(event){
    $("#wcontext_menu").css("display", "none");
    var x = event.offsetX;
    var y = event.offsetY;
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
        columna = Math.floor(x/30) + wRender.primera_columna-1
        fila = Math.floor((world.height-y)/30) + wRender.primera_fila-1

        excedente_horizontal = x/30 - Math.floor(x/30)
        excedente_vertical = (world.height-y)/30 - Math.floor((world.height-y)/30)

        if (0<fila && fila<101 && 0<columna && columna<101) {
            if (.25<excedente_horizontal && excedente_horizontal<.75 && .25<excedente_vertical && excedente_horizontal<.75) {
                if (borrar_zumbadores) {
                    mundo.setBuzzers(fila, columna, 0);
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
    //Volvemos a pintar el canvas
    wRender.paint(mundo, world.width, world.height);
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
    wRender.paint(mundo, world.width, world.height);
  });
  $("#world").bind("contextmenu", function(e){
    //Maneja el click derecho sobre el mundo
    var x = event.pageX;
    var y = event.pageY;

    columna_evento = Math.floor(event.offsetX/30) + wRender.primera_columna-1;
    fila_evento = Math.floor((world.height-event.offsetY)/30) + wRender.primera_fila-1;

    $("#wcontext_menu").css("top", y+"px");
    $("#wcontext_menu").css("left", x+"px");
    $("#wcontext_menu").css("display", "block");
    return false;
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

    wRender.paint(mundo, world.width, world.height);
    return false;
  };
  $("#ctx_norte").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('NORTE');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_sur").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('SUR');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_este").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('ESTE');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
  $("#ctx_oeste").click(function(event){
    mundo.move(fila_evento, columna_evento);
    mundo.rotate('OESTE');
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
  $("#n_zumbadores").click(function(event){
    mundo.setBuzzers(fila_evento, columna_evento, prompt("¿Cuántos zumbadores?", '0'));
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
  $("#inf_zumbadores_ctx").click(function(event){
    mundo.setBuzzers(fila_evento, columna_evento, -1);
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
  $("#cero_zumbadores").click(function(event) {
    mundo.setBuzzers(fila_evento, columna_evento, 0);
    $("#wcontext_menu").css("display", "none");
    wRender.paint(mundo, world.width, world.height);
    $("#xmlMundo").html(mundo.save());
  });
});
