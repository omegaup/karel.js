#!/bin/bash

for problem in ../test/problems/*; do
	echo $(basename "${problem}")
	../cmd/kareljs compile "${problem}/sol.txt" -o sol.kx || die
	for casename in "${problem}/cases"/*.in; do
		./karel sol.kx < "${casename}" | diff -Naurw --ignore-blank-lines "${casename%.in}.out" -
	done
done
