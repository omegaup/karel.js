module.exports = function(grunt) {

	grunt.initConfig({
		jison: {
			karelPascal: {
				options: {
					moduleType: 'js',
					moduleName: 'karelpascal',
				},
				files: {
					'js/karelpascal.js': 'gramaticas/karelpascal.jison',
				}
			},
			karelJava: {
				options: {
					moduleType: 'js',
					moduleName: 'kareljava',
				},
				files: {
					'js/kareljava.js': 'gramaticas/kareljava.jison',
				}
			},
			karelRuby: {
				options: {
					moduleType: 'js',
					moduleName: 'karelruby',
				},
				files: {
					'js/karelruby.js': 'gramaticas/karelruby.jison',
				}
			},
		},
		jshint: {
			files: ['js/karel.js', 'js/karelide.js'],
		},
		concat: {
			dist: {
				src: [
					'js/codemirror-karelpascal.js',
					'js/codemirror-karelruby.js',
					'js/karelpascal.js',
					'js/karelruby.js',
					'js/karel.js',
					'js/karelide.js'
				],
				dest: 'js/karel-distrib.js',
			}
		},
		uglify: {
			dist: {
				files: {
					'js/karel-distrib.min.js': ['js/karel-distrib.js']
				},
			},
		},
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-jison');

	grunt.registerTask('default', ['jison', 'jshint', 'concat', 'uglify']);
};
