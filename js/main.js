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
      paint(world.getContext('2d'), mundo, world.width, world.height);
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
    paint(world.getContext('2d'), mundo, world.width, world.height);
  });
  $("#newworld").click(function(event){
    mundo = new World(100, 100);
    paint(world.getContext('2d'), mundo, world.width, world.height);
  });
});
