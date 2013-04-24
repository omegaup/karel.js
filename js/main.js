$(document).ready(function(){
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/github");
  editor.getSession().setMode("ace/mode/text");

  var world = $("#world")[0];
  var mundo = new World(100, 100);
  mundo.load($('script#xmlMundo')[0].textContent);
  paint(world.getContext('2d'), mundo, world.width, world.height);

  var interval = null;

  function step() {
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
      while (mundo.runtime.step());
      paint(world.getContext('2d'), mundo, world.width, world.height);
      editor.focus();
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+sintaxis+')');
      editor.focus();
    }
  });
  $("#paso").click(function(event){
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
      interval = setInterval(step, 500);
    } catch(e) {
      $('#mensajes').prepend('<p><strong>['+d.toLocaleString()+']</strong> <pre>'+e+'</pre> (sintaxis '+sintaxis+')');
      editor.focus();
    }
  });
});
