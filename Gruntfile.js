module.exports = function(grunt) {

	grunt.initConfig({
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

	grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};
