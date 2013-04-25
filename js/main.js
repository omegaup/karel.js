$(document).ready(function(){
  //Prepatación del editor
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/github");
  editor.getSession().setMode("ace/mode/text");

  var world = $("#world")[0];
  var mundo = new World(100, 100);
  mundo.load($('script#xmlMundo')[0].textContent);
  paint(world.getContext('2d'), mundo, world.width, world.height);

  var interval = null;

  function step() {
    //Avanza un paso en la ejecución del código
    while (!mundo.dirty && mundo.runtime.step());

    mundo.dirty = false;

    paint(world.getContext('2d'), mundo, world.width, world.height);

    if (!mundo.runtime.state.running) {
      clearInterval(interval);
      interval = null;
    }
  }

  $("#compilar").click(function(event){
    var sintaxis = detecta_sintaxis(editor.getValue());
    d = new Date();
    try {
      if(sintaxis == 'pascal')
        var compiled = new karelpascal.Parser().parse(editor.getValue());
      else if(sintaxis == 'ruby')
        var compiled = new karelruby.Parser().parse(editor.getValue());
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> Programa compilado (sintaxis '+sintaxis+')');
      editor.focus();
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+sintaxis+')</p>');
      editor.focus();
    }
  });
  $("#futuro").click(function(event){
    var sintaxis = detecta_sintaxis(editor.getValue());
    var d = new Date();
    try {
      if(sintaxis == 'pascal')
        var compiled = new karelpascal.Parser().parse(editor.getValue());
      else if(sintaxis == 'ruby')
        var compiled = new karelruby.Parser().parse(editor.getValue());
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> Programa compilado (sintaxis '+sintaxis+')');

      mundo.reset();
      mundo.runtime.load(compiled);
      while (mundo.runtime.step());
      paint(world.getContext('2d'), mundo, world.width, world.height);
      editor.focus();
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+sintaxis+')');
      editor.focus();
    }
  });
  $("#ejecutar").click(function(event){
    var sintaxis = detecta_sintaxis(editor.getValue());
    var d = new Date();
    try {
      if(sintaxis == 'pascal')
        var compiled = new karelpascal.Parser().parse(editor.getValue());
      else if(sintaxis == 'ruby')
        var compiled = new karelruby.Parser().parse(editor.getValue());
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> Programa compilado (sintaxis '+sintaxis+')');

      mundo.reset();
      mundo.runtime.load(compiled);
      interval = setInterval(step, $("#retraso_txt").val());
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+sintaxis+')');
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
    paint(world.getContext('2d'), mundo, world.width, world.height);
  });
  $("#newworld").click(function(event){
    mundo = new World(100, 100);
    paint(world.getContext('2d'), mundo, world.width, world.height);
  });
});
