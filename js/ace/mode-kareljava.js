ace.define(
	"ace/mode/kareljava",
	["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/kareljava_highlight_rules","ace/mode/folding/coffee"],
	function(e,t,n){
		var r=e("../lib/oop"),
		    i=e("./text").Mode,
		    s=e("../tokenizer").Tokenizer,
		    o=e("./kareljava_highlight_rules").karelHighlightRules,
		    u=e("./folding/coffee").FoldMode,
		    a=function(){
			var e=new o;
			this.foldingRules=new u;
			this.$tokenizer=new s(e.getRules());
		};
		r.inherits(a,i);
		(function(){
			this.lineCommentStart=["//"];
			this.blockComment=[
				{start:"/*",end:"*/"}
			];
		}).call(a.prototype);
		t.Mode=a;
	}
);
ace.define(
	"ace/mode/kareljava_highlight_rules",
	["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],
	function(e,t,n){
		var r=e("../lib/oop"),
		    i=e("./text_highlight_rules").TextHighlightRules,
		    s=function(){
			this.$rules={start:[
				{
					caseInsensitive:!0,
					token:"keyword.control",
					regex:"\\b(?:(class|program|define|if|else|while|iterate))\\b"
				},{
					caseInsensitive:!0,
					token:"support.constant",
					regex:"\\b(?:(front|left|right)Is(Clear|Blocked)|(notN|n)extToABeeper|(notF|f)acing(North|South|East|West)|(any|no)BeepersInBeeperBag)\\b"
				},{
					caseInsensitive:!0,
					token:"variable.language",
					regex:"\\b(?:(turnoff|turnleft|move|pickbeeper|putbeeper))\\b"
				},{
					caseInsensitive:!0,
					token:"keyword.operator",
					regex:"(?:(!|\\|\\||\\&\\&|¬))"
				},{
					caseInsensitive:!0,
					token:["keyword.control","text","entity.name.function","text","variable.parameter","text"],
					regex:"\\b(define|void)(\\s+)([a-zA-Z][a-zA-Z0-9-]*)(\\s*\\(\\s*)([a-zA-Z][a-zA-Z0-9-]*)(\\s*\\)\\s*)"
				},{
					caseInsensitive:!0,
					token:["keyword.control","text","entity.name.function"],
					regex:"\\b(void|define)(\\s+)([a-zA-Z][a-zA-Z0-9-]*)"
				},{
					token:"constant.numeric",
					regex:"\\b[0-9]+\\b"
				},{
					token:"punctuation.definition.comment.karel",
					regex:"//",
					push:[{token:"comment.line.double-slash.karel.two",regex:"$",next:"pop"},{defaultToken:"comment.line.double-slash.karel.two"}]
				},{
					token:"punctuation.definition.comment.karel",
					regex:"/\\*",
					push:[{token:"punctuation.definition.comment.karel",regex:"\\*/",next:"pop"},{defaultToken:"comment.block.karel.one"}]
				}
			]};
			this.normalizeRules();
		};
		r.inherits(s,i);
		t.karelHighlightRules=s;
	}
);
ace.define(
	"ace/mode/folding/coffee",
	["require","exports","module","ace/lib/oop","ace/mode/folding/fold_mode","ace/range"],
	function(e,t,n){
		var r=e("../../lib/oop"),
		    i=e("./fold_mode").FoldMode,
		    s=e("../../range").Range,
		    o=t.FoldMode=function(){};
		r.inherits(o,i);
		(function(){
			this.getFoldWidgetRange=function(e,t,n){
				var r=this.indentationBlock(e,n);
				if(r)return r;
				var i=/\S/,o=e.getLine(n),u=o.search(i);
				if(u==-1||o[u]!="#")return;
				var a=o.length,
				    f=e.getLength(),
				    l=n,
				    c=n;
				while(++n<f){
					o=e.getLine(n);
					var h=o.search(i);
					if(h==-1)continue;
					if(o[h]!="#")break;
					c=n;
				}
				if(c>l){
					var p=e.getLine(c).length;
					return new s(l,a,c,p);
				}
			};
			this.getFoldWidget=function(e,t,n){
				var r=e.getLine(n),
				    i=r.search(/\S/),
				    s=e.getLine(n+1),
				    o=e.getLine(n-1),
				    u=o.search(/\S/),
				    a=s.search(/\S/);
				if(i==-1){
					return e.foldWidgets[n-1]=u!=-1&&u<a?"start":"","";
				}
				if(u==-1){
					if(i==a&&r[i]=="#"&&s[i]=="#") {
						return e.foldWidgets[n-1]="",e.foldWidgets[n+1]="","start";
					}
				}else if(u==i&&r[i]=="#"&&o[i]=="#"&&e.getLine(n-2).search(/\S/)==-1){
					return e.foldWidgets[n-1]="start",e.foldWidgets[n+1]="","";
				}
				return u!=-1&&u<i?e.foldWidgets[n-1]="start":e.foldWidgets[n-1]="",i<a?"start":"";
			}
		}).call(o.prototype);
	}
);
