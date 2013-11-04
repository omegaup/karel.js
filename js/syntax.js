CodeMirror.defineMode("karelpascal", function() {
  function words(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }
  var keywords = words("iniciar-programa finalizar-programa inicia-ejecucion termina-ejecucion si sino entonces repetir veces mientras hacer como sal-de-instruccion define-nueva-instruccion define-prototipo-instruccion");
	var indent = words("iniciar-programa finalizar-programa inicia-ejecucion termina-ejecucion inicio");
	var dedent = words("fin");
	var builtin = words("coge-zumbador deja-zumbador gira-izquierda avanza apagate");
	var operator = words("y o no si-es-cero precede sucede");
	var atoms = words("frente-libre frente-bloqueado izquierda-libre izquierda-bloqueada derecha-libre derecha-bloqueada junto-a-zumbador no-junto-a-zumbador algun-zumbador-en-la-mochila ningun-zumbador-en-la-mochila orientado-al-norte orientado-al-sur orientado-al-este orientado-al-oeste no-orientado-al-norte no-orientado-al-sur no-orientado-al-este no-orientado-al-oeste");

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == "{") {
      state.tokenize = tokenSimpleComment;
      return tokenSimpleComment(stream, state);
    }
    if (ch == "(" && stream.eat("*")) {
      state.tokenize = tokenComment;
      return tokenComment(stream, state);
    }
    if (/[\(\);]/.test(ch)) {
      return null;
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.]/);
      return "number";
    }
    stream.eatWhile(/[\w_-]/);
    var cur = stream.current().toLowerCase();
		var style = "variable";
    if (keywords.propertyIsEnumerable(cur)) style = "keyword";
		else if (builtin.propertyIsEnumerable(cur)) style = "builtin";
		else if (operator.propertyIsEnumerable(cur)) style = "operator";
		else if (atoms.propertyIsEnumerable(cur)) style = "atom";
		else if (indent.propertyIsEnumerable(cur)) style = "indent";
		else if (dedent.propertyIsEnumerable(cur)) style = "dedent";
		else if (state.lastTok == 'define-nueva-instruccion' || state.lastTok == 'define-prototipo-instruccion') style = "def";
		state.lastTok = cur;
    return style;
  }

  function tokenSimpleComment(stream, state) {
    while (ch = stream.next()) {
      if (ch == '}') {
        state.tokenize = null;
        break;
      }
    }
    return "comment";
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == ")" && maybeEnd) {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  // Interface

  return {
    startState: function() {
      return {
				tokenize: null,
				lastTok: null
			};
    },

    token: function(stream, state) {
      if (stream.eatSpace()) return null;
      return (state.tokenize || tokenBase)(stream, state);
    },
  };
});

CodeMirror.defineMIME("text/x-karelpascal", "karelpascal");
