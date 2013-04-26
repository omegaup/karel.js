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

  //Preparación del editor
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/github");
  editor.getSession().setMode("ace/mode/text");

  var world = $("#world")[0];
  var context = world.getContext('2d');
  var wRender = new WorldRender(context);
  var mundo = new World(100, 100);
  mundo.load($('script#xmlMundo')[0].textContent);
  wRender.paint(mundo, world.width, world.height);

  var interval = null;

  function step() {
    //Avanza un paso en la ejecución del código
    while (!mundo.dirty && mundo.runtime.step());

    mundo.dirty = false;

    wRender.paint(mundo, world.width, world.height);

    if (!mundo.runtime.state.running) {
      clearInterval(interval);
      interval = null;
    }
  }

  $("#compilar").click(function(event){
    var d = new Date();
    var syntax = getSyntax(editor.getValue());
    try {
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> Programa compilado (sintaxis '+syntax.name+')');
      editor.focus();
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+syntax.name+')</p>');
      editor.focus();
    }
  });
  $("#futuro").click(function(event){
    var d = new Date();
    var syntax = getSyntax(editor.getValue());
    try {
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> Programa compilado (sintaxis '+syntax.name+')');

      mundo.reset();
      mundo.runtime.load(compiled);
      while (mundo.runtime.step());
      wRender.paint(mundo, world.width, world.height);
      editor.focus();
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+syntax.name+')');
      editor.focus();
    }
  });
  $("#ejecutar").click(function(event){
    var d = new Date();
    var syntax = getSyntax(editor.getValue());
    try {
      var compiled = syntax.parser.parse(editor.getValue());
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> Programa compilado (sintaxis '+syntax.name+')');

      mundo.reset();
      mundo.runtime.load(compiled);
      interval = setInterval(step, $("#retraso_txt").val());
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+syntax.name+')');
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
    editor.setValue("class karel {\n    karel() {\n        //TODO poner codigo aqui\n        turnoff();\n    }\n}", 1);
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
  $("#worldclean").click(function(event){
    mundo.load($('script#xmlMundo')[0].textContent);
    wRender.paint(mundo, world.width, world.height);
  });
  $("#newworld").click(function(event){
    mundo = new World(100, 100);
    wRender.paint(mundo, world.width, world.height);
  });
  $("#world").click(function(event){
    var x = event.offsetX;
    var y = event.offsetY;
    console.log(x+','+y)
    //Maneja los clicks en el mundo
    if ((world.width-50)<=x && x <=(world.width-20) && 10<=y && y<=40) {
        //NORTE
        if (this.primera_fila+self.num_filas-2 < 100)
            this.primera_fila += 1
    } else if ((world.width-50)<=x && x<=(world.width-20) && 80<=y && y<=110) {
        //SUR
        if (this.primera_fila > 1)
            this.primera_fila -= 1
    } else if ((world.width-50+17)<=x && x<=(world.width-20+17) && 45<=y && y<=75) {
        //ESTE
        if (this.primera_columna+self.num_columnas-2 < 100)
            this.primera_columna += 1
    } else if ((world.width-50+17-35)<=x && x<=(world.width-20+17-35) && 45<=y && y<=75) {
        //OESTE
        if (this.primera_columna > 1)
            this.primera_columna -= 1
    } else { //Pasan otras cosas
        columna = int(x/30) + this.primera_columna-1
        fila = int((world.height-y)/30) + this.primera_fila-1

        excedente_horizontal = x/30 - int(x/30)
        excedente_vertical = (world.height-y)/30 - int((world.height-y)/30)

        if (0<fila && fila<101 && 0<columna && columna<101) {
            if (event.button == 1) {
                if (.25<excedente_horizontal && excedente_horizontal<.75 && .25<excedente_vertical && excedente_horizontal<.75) {
                    if (self.borrar_zumbadores)
                        self.mundo.pon_zumbadores((fila, columna), 0)
                    else {
                        zumbadores = self.mundo.obten_zumbadores((fila, columna))
                        if (zumbadores >= 0)
                            self.mundo.pon_zumbadores((fila, columna), zumbadores+1)
                    }
                } else if (excedente_horizontal > excedente_vertical) {
                    if (excedente_horizontal > 1 - excedente_vertical)
                        self.mundo.conmuta_pared((fila, columna), 'este')
                    else
                        self.mundo.conmuta_pared((fila, columna), 'sur')
                } else {
                    if (excedente_horizontal > 1 - excedente_vertical)
                        self.mundo.conmuta_pared((fila, columna), 'norte')
                    else
                        self.mundo.conmuta_pared((fila, columna), 'oeste')
                }
                self.mundo_guardado = False
            } else if (event.button == 2) {
                console.log('boton medio')
            } else if (event.button == 3) {
                self.coordenadas = (fila, columna)
                self.builder.get_object('mundo_canvas_context_menu').popup(None, None, None, None, 3, event.time)
            }
        }
    }
    canvas.queue_draw() //Volvemos a pintar el canvas
  });
});
