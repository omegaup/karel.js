ascii_letters = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'

KLexer = function(cadena, debug){
    this.ESTADO_ESPACIO = ' '
    this.ESTADO_PALABRA = 'a'
    this.ESTADO_COMENTARIO = '//'
    this.ESTADO_NUMERO = '0'
    this.ESTADO_SIMBOLO = '+'

    this.lee_caracter = function(){
    /* Lee un caracter de la fuente */
        this.ultimo_caracter = this.caracter_actual
        var c = this.cadena[this.indice];
        this.indice ++;
        return c;
    }
    //Se construye el analizador con el nombre del archivo
    this.cadena = cadena
    this.indice = 0

    this.numeros = "0123456789"
    this.palabras = "abcdfeghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-"
    this.simbolos = "(){}*/;,|&!//" //Simbolos permitidos para esta sintaxis
    this.espacios = " \n\r\t"

    this.caracteres = this.numeros+this.palabras+this.simbolos+this.espacios

    this.ultimo_caracter = ''
    this.caracter_actual = ''
    this.abrir_comentario = '' //Indica cómo fue abierto un comentario

    this.pila_tokens = [] //Pila de tokens por si me lo devuelven
    this.char_pushed = false //Indica cuando un caracter ha sido puesto en la pila

    this.linea = 1 //El número de linea
    this.columna = 0//El número de columna
    this.es_primer_token = true //Registra si se trata del primer token de la linea
    this.token = ''
    this.estado = this.ESTADO_ESPACIO

    this.sintaxis = 'pascal' //para la gestion de los comentarios
    this.lonely_chars = [';', '{', '}', '!', ')', '#']

    this.caracter_actual = this.lee_caracter()
    this.debug = debug

    this.establecer_sintaxis = function(sintaxis){
        // Establece la sintaxis para este análisis"""
        if (sintaxis == 'java'){
            this.lonely_chars.push('(')
            this.lonely_chars.push(')')
        }
        if (sintaxis == 'ruby'){
            this.lonely_chars.splice(5, 1)
        }
        this.sintaxis = sintaxis
    }

    this.get_token = function(){
        /* Obtiene el siguiente token. Si la pila tiene tokens le quita
         * uno, si no, obtiene el siguiente token del archivo*/
        if (this.pila_tokens.length > 0){
            return this.pila_tokens.pop()
        } else {
            return this.lee_token()
        }
    }

    this.push_token = function(token){
        /* Empuja un token en la pila */
        this.pila_tokens.push(token)
    }

    this.cambio_de_linea = function(){
        this.linea += 1
        this.columna = 0
        this.es_primer_token = true
    }

    this.lee_token = function(){
        // Lee un token del archivo"""
        while (true){
            this.columna += 1
            if (! this.caracter_actual){
                break
            }
            if (this.estado == this.ESTADO_COMENTARIO){
                if (this.debug){
                    console.log( "Encontré '"+this.caracter_actual+"' en estado comentario")
                }
                if (this.simbolos.indexOf(this.caracter_actual)!=-1){ //Lo que puede pasar es que sea basura o termine el comentario
                    if (this.caracter_actual == ')' && this.abrir_comentario == '(*' && this.ultimo_caracter == '*')
                        this.estado = this.ESTADO_ESPACIO
                    if (this.caracter_actual == '}' && this.abrir_comentario == '{')
                        this.estado = this.ESTADO_ESPACIO
                    if (this.caracter_actual == '/' && this.abrir_comentario == '/*' && this.ultimo_caracter == '*')
                        this.estado = this.ESTADO_ESPACIO
                }
                if (this.caracter_actual == '\n') //LINEA
                    this.cambio_de_linea()
            } else if (this.estado == this.ESTADO_ESPACIO){
                if (this.debug)
                    console.log( "Encontré "+this.caracter_actual+" en estado espacio")
                if (this.caracteres.indexOf(this.caracter_actual)==-1)
                    throw "Caracter desconocido en la linea "+this.linea+" columna "+this.columna
                if (this.numeros.indexOf(this.caracter_actual) != -1){
                    this.token += this.caracter_actual
                    this.estado = this.ESTADO_NUMERO
                } else if (this.palabras.indexOf(this.caracter_actual) != -1){
                    this.token += this.caracter_actual
                    this.estado = this.ESTADO_PALABRA
                } else if (this.simbolos.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_SIMBOLO
                    continue
                } else if (this.caracter_actual == '\n') //LINEA
                    this.cambio_de_linea()
            } else if (this.estado == this.ESTADO_NUMERO){
                if (this.debug)
                    console.log( "Encontré "+this.caracter_actual+" en estado número")
                if (this.caracteres.indexOf(this.caracter_actual) == -1)
                    throw "Caracter desconocido en la linea "+this.linea+" columna "+this.columna
                if (this.numeros.indexOf(this.caracter_actual) != -1)
                    this.token += this.caracter_actual
                else if (this.palabras.indexOf(this.caracter_actual) != -1) //Encontramos una letra en el estado numero, incorrecto
                    throw "Este token no parece valido, linea "+this.linea+" columna "+this.columna
                else if (this.simbolos.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_SIMBOLO
                    break
                } else if (this.espacios.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_ESPACIO
                    break //Terminamos este token
                }
            } else if (this.estado == this.ESTADO_PALABRA){
                if (this.debug)
                    console.log( "Encontré "+this.caracter_actual+" en estado palabra")
                if (this.caracteres.indexOf(this.caracter_actual)==-1)
                    throw "Caracter desconocido en la linea "+this.linea+" columna "+this.columna
                if ((this.palabras+this.numeros).indexOf(this.caracter_actual) != -1)
                    this.token += this.caracter_actual
                else if (this.simbolos.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_SIMBOLO
                    break
                } else if (this.espacios.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_ESPACIO
                    break //Terminamos este token
                }
            } else if (this.estado == this.ESTADO_SIMBOLO){
                if (this.debug)
                    console.log( "Encontré "+this.caracter_actual+" en estado símbolo")
                if (this.caracteres.indexOf(this.caracter_actual) == -1)
                    throw "Caracter desconocido en la linea "+this.linea+" columna "+this.columna
                if (this.caracter_actual == '{'){
                    this.abrir_comentario = '{'
                    this.estado = this.ESTADO_COMENTARIO
                    if (this.token)
                        break
                } else if (this.caracter_actual == '#'){
                    this.estado = this.ESTADO_ESPACIO
                    this.archivo.readline() //LINEA
                    this.cambio_de_linea()
                    if (this.token)
                        break
                } else if (this.numeros.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_NUMERO
                    if (this.token)
                        break
                } else if (this.palabras.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_PALABRA
                    if (this.token)
                        break
                } else if (this.simbolos.indexOf(this.caracter_actual) != -1){ //Encontramos un símbolo en estado símbolo
                    if (this.caracter_actual == '/' && this.ultimo_caracter == '/'){
                        this.archivo.readline() //LINEA
                        this.cambio_de_linea()
                        this.estado = this.ESTADO_ESPACIO
                        if (this.token.charAt(this.token.length-1) == '/')
                            this.token = this.token.slice(0, this.token.length-1)
                        if (this.token){
                            this.caracter_actual = this.lee_caracter()
                            break
                        }
                    } else if (this.caracter_actual == '*' && this.ultimo_caracter == '/'){
                        this.estado = this.ESTADO_COMENTARIO
                        this.abrir_comentario = '/*'
                        if (this.token.charAt(this.token.length-1) == '/')
                            this.token = this.token.slice(0, this.token.length-1)
                        if (this.token){
                            this.caracter_actual = this.lee_caracter()
                            break
                        }
                    } else if (this.caracter_actual == '*' && this.ultimo_caracter == '('){
                        this.estado = this.ESTADO_COMENTARIO
                        this.abrir_comentario = '(*'
                        if (this.token.charAt(this.token.length-1) == '(')
                            this.token = this.token.slice(0, this.token.length-1)
                        if (this.token){
                            this.caracter_actual = this.lee_caracter()
                            break
                        }
                    } else if (this.lonely_chars.indexOf(this.caracter_actual) != -1){ //Caracteres que viven solos
                        this.estado = this.ESTADO_ESPACIO
                        if (this.token)
                            break
                        this.token += this.caracter_actual
                        this.caracter_actual = this.lee_caracter()
                        break
                    } else
                        this.token += this.caracter_actual
                } else if (this.espacios.indexOf(this.caracter_actual) != -1){
                    this.estado = this.ESTADO_ESPACIO
                    if (this.token)
                        break
                } else
                    throw "Caracter desconocido en la linea "+this.linea+" columna "+this.columna
            }
            this.caracter_actual = this.lee_caracter()
        }
        token = this.token
        this.token = ''
        var obj_token = new Object;
        obj_token.token = token
        obj_token.es_primer_token = this.es_primer_token
        obj_token.toString = function(){
            return this.token
        }
        obj_token.lower = function(){
            this.token = this.token.toLowerCase()
        }
        this.es_primer_token = false
        return obj_token
    }
}

function detecta_sintaxis(codigo) {
    var lexer = new KLexer(codigo)
    var primer_token = lexer.get_token()

    if(primer_token.token == 'iniciar-programa')
      return 'pascal'
    if(primer_token.token == 'class')
      return 'java'
    return 'ruby'
}
