/* Karel */

%lex
%options case-insensitive
%options flex
%%

\s+                                         {/* ignore */}
\/\/[^\n]*                                  {/* ignore */}
\/\*(?:[^*]|\*(?!\/))*\*\/                  {/* ignore */}
defineLaInstrucci[óo]n                      { return 'DEF'; }
salDeInstrucci[oó]n                         { return 'RET'; }
"comoSigue"                                 { return 'AS'; }
ap[aá]gate                                  { return 'HALT'; }
"giraIzquierda"                             { return 'LEFT'; }
"avanza"                                    { return 'FORWARD'; }
"recogeUnZumbador"                          { return 'PICKBUZZER'; }
"dejaUnZumbador"                            { return 'LEAVEBUZZER'; }
"haz"                                       { return 'BEGIN'; }
"fin"                                       { return 'END'; }
"entonces"                                  { return 'THEN'; }
"mientras"                                  { return 'WHILE'; }
"repite"                                    { return 'REPEAT'; }
"veces"                                     { return 'TIMES'; }
elN[uú]meroAnteriorA                        { return 'DEC'; }
elN[uú]meroSiguienteDe                      { return 'INC'; }
"elValorDe"                                 { return 'VALUEOF'; }
"esCero"                                    { return 'IFZ'; }
"tienesElFrenteLibre"                       { return 'IFNFWALL'; }
"tengasElFrenteLibre"                       { return 'IFNFWALL'; }
"tienesLaIzquierdaLibre"                    { return 'IFNLWALL'; }
"tengasLaIzquierdaLibre"                    { return 'IFNLWALL'; }
"tienesLaDerechaLibre"                      { return 'IFNRWALL'; }
"tengasLaDerechaLibre"                      { return 'IFNRWALL'; }
"tienesZumbadoresEnLaMochila"               { return 'IFBBUZZER'; }
"tengasZumbadoresEnLaMochila"               { return 'IFBBUZZER'; }
est[aáeé]sJuntoAZumbador                    { return 'IFWBUZZER'; }
est[aáeé]sOrientadoAlNorte                  { return 'IFN'; }
est[aáeé]sOrientadoAlSur                    { return 'IFS'; }
est[aáeé]sOrientadoAlEste                   { return 'IFE'; }
est[aáeé]sOrientadoAlOeste                  { return 'IFW'; }
"deLoContrario"                             { return 'ELSE'; }
"si"                                        { return 'IF'; }
"no"                                        { return 'NOT'; }
[ou]                                        { return 'OR'; }
[ye]                                        { return 'AND'; }
"("                                         { return '('; }
")"                                         { return ')'; }
[0-9]+                                      { return 'NUM'; }
[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*   { return 'VAR'; }
<<EOF>>                                     { return 'EOF'; }
/lex

%nonassoc XIF
%nonassoc ELSE

%{
function validate(function_list, program, yy) {
	var functions = {};
	var prototypes = {};

	for (var i = 0; i < function_list.length; i++) {
		if (functions[function_list[i][0]]) {
			yy.parser.parseError("Function redefinition: " + function_list[i][0], {
				text: function_list[i][0],
				line: function_list[i][3]
			});
		}
		if (function_list[i][0] == 'principal' && function_list[i][2] != 1) {
			yy.parser.parseError("'principal' must have one parameter", {
				text: function_list[i][0],
				line: function_list[i][3]
			});
		}

		functions[function_list[i][0]] = program.length;
		prototypes[function_list[i][0]] = function_list[i][2];
		program = program.concat(function_list[i][1]);
	}

	var current_line = 0;
	for (var i = 0; i < program.length; i++) {
		if (program[i][0] == 'LINE') {
			current_line = program[i][1];
		} else if (program[i][0] == 'CALL') {
			if (!functions[program[i][1]]) {
				yy.parser.parseError("Undefined function: " + program[i][1], {
					text: program[i][1],
					line: current_line
				});
			} else if (prototypes[program[i][1]] != program[i][2]) {
				yy.parser.parseError("Function parameter mismatch: " + program[i][1], {
					text: program[i][1],
					line: current_line
				});
			}
			program[i][2] = program[i][1];
			program[i][1] = functions[program[i][1]];
		} else if (program[i][0] == 'PARAM' && program[i][1] != 0) {
			yy.parser.parseError("Unknown variable: " + program[i][1], {
				text: program[i][1],
				line: current_line + 1
			});
		}
	}

	return program;
}
%}

%%

program
  : def_list EOF
    { return validate($def_list, [['LOAD', 0], ['CALL', 'principal', 1], ['HALT']], yy); }
  ;

def_list
  : def_list def
    { $$ = $def_list.concat($def); }
  | def
    { $$ = $def; }
  ;

def
  : DEF line var AS expr
    { $$ = [[$var.toLowerCase(), $line.concat($expr).concat([['RET']]), 1, $line[0][1]]]; }
  | DEF line var '(' var ')' AS expr
    %{
    	var result = $line.concat($expr).concat([['RET']]);
      var current_line = $line[0][1];
    	for (var i = 0; i < result.length; i++) {
        if (result[i][0] == 'LINE') {
          current_line = result[i][1];
        } else if (result[i][0] == 'PARAM') {
    			if (result[i][1] == $5.toLowerCase()) {
    				result[i][1] = 0;
    			} else {
    				yy.parser.parseError("Unknown variable: " + $5, {
              text: $5,
              line: current_line + 1
            });
    			}
    		}
    	}
    	$$ = [[$var.toLowerCase(), result, 2, $line[0][1]]];
    %}
  ;


expr_list
  : expr_list expr
    { $$ = $expr_list.concat($expr); }
  |
    { $$ = []; }
  ;

expr
  : FORWARD
    { $$ = [['LINE', yylineno], ['WORLDWALLS'], ['ORIENTATION'], ['MASK'], ['AND'], ['NOT'], ['EZ', 'WALL'], ['FORWARD']]; }
  | LEFT
    { $$ = [['LINE', yylineno], ['LEFT']]; }
  | PICKBUZZER
    { $$ = [['LINE', yylineno], ['WORLDBUZZERS'], ['EZ', 'WORLDUNDERFLOW'], ['PICKBUZZER']]; }
  | LEAVEBUZZER
    { $$ = [['LINE', yylineno], ['BAGBUZZERS'], ['EZ', 'BAGUNDERFLOW'], ['LEAVEBUZZER']]; }
  | HALT
    { $$ = [['LINE', yylineno], ['HALT']]; }
  | RET
    { $$ = [['LINE', yylineno], ['RET']]; }
  | call
    { $$ = $call; }
  | cond
    { $$ = $cond; }
  | loop
    { $$ = $loop; }
  | repeat
    { $$ = $repeat; }
  | BEGIN expr_list END
    { $$ = $expr_list; }
  ;

call
  : var
    { $$ = [['LINE', yylineno], ['LOAD', 0], ['CALL', $var.toLowerCase(), 1], ['LINE', yylineno]]; }
  | var '(' integer ')'
    { $$ = [['LINE', yylineno]].concat($integer).concat([['CALL', $var.toLowerCase(), 2], ['LINE', yylineno]]); }
  ;

cond
  : IF line term THEN expr %prec XIF
    { $$ = $term.concat($line).concat([['JZ', $expr.length]]).concat($expr); }
  | IF line term THEN expr ELSE expr
    { $$ = $term.concat($line).concat([['JZ', 1 + $5.length]]).concat($5).concat([['JMP', $7.length]]).concat($7); }
  ;

loop
  : WHILE line term expr
    { $$ = $term.concat($line).concat([['JZ', 1 + $expr.length]]).concat($expr).concat([['JMP', -1 -($term.length + 1 + $expr.length + 1)]]); }
  ;

repeat
  : REPEAT line integer TIMES expr
    { $$ = $integer.concat($line).concat([['DUP'], ['LOAD', 0], ['EQ'], ['NOT'], ['JZ', $expr.length + 2]]).concat($expr).concat([['DEC'], ['JMP', -1 -($expr.length + 7)], ['POP']]); }
  ;

term
  : term OR and_term
    { $$ = $term.concat($and_term).concat([['OR']]); }
  | and_term
    { $$ = $and_term; }
  ;

and_term
  : and_term AND not_term
    { $$ = $and_term.concat($not_term).concat([['AND']]); }
  | not_term
    { $$ = $not_term; }
  ;

not_term
  : NOT clause
    { $$ = $clause.concat([['NOT']]); }
  | clause
    { $$ = $clause; }
  ;

clause
  : IFZ '(' integer ')'
    { $$ = $integer.concat([['NOT']]); }
  | bool_fun
    { $$ = $bool_fun; }
  | '(' term ')'
    { $$ = $term; }
  ;

bool_fun
  : IFNFWALL
    { $$ = [['WORLDWALLS'], ['ORIENTATION'], ['MASK'], ['AND'], ['NOT']]; }
  | IFNLWALL
    { $$ = [['WORLDWALLS'], ['ORIENTATION'], ['ROTL'], ['MASK'], ['AND'], ['NOT']]; }
  | IFNRWALL
    { $$ = [['WORLDWALLS'], ['ORIENTATION'], ['ROTR'], ['MASK'], ['AND'], ['NOT']]; }
  | IFWBUZZER
    { $$ = [['WORLDBUZZERS'], ['LOAD', 0], ['EQ'], ['NOT']]; }
  | IFBBUZZER
    { $$ = [['BAGBUZZERS'], ['LOAD', 0], ['EQ'], ['NOT']]; }
  | IFW
    { $$ = [['ORIENTATION'], ['LOAD', 0], ['EQ']]; }
  | IFN
    { $$ = [['ORIENTATION'], ['LOAD', 1], ['EQ']]; }
  | IFE
    { $$ = [['ORIENTATION'], ['LOAD', 2], ['EQ']]; }
  | IFS
    { $$ = [['ORIENTATION'], ['LOAD', 3], ['EQ']]; }
  ;

integer
  : var
    { $$ = [['PARAM', $var.toLowerCase()]]; }
  | NUM
    { $$ = [['LOAD', parseInt(yytext)]]; }
  | VALUEOF '(' integer ')'
    { $$ = $integer; }
  | INC '(' integer ')'
    { $$ = $integer.concat([['INC']]); }
  | DEC	 '(' integer ')'
    { $$ = $integer.concat([['DEC']]); }
  ;

var
  : VAR
    { $$ = yytext; }
  ;

line
  :
    { $$ = [['LINE', yylineno]]; }
  ;
