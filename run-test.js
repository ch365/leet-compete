var runTest = `
bool runTest(int testNum, {{inputs}}, {{outputType}} expected) {
\tSolution *sol = new Solution();
\tclock_t startTime = clock();
\t{{outputType}} answer = sol->{{funcName}}({{inputArgs}});
\tclock_t endTime = clock();
\tdelete sol;
\tcout << "[ Test " << testNum << " ]" << endl;
\tcout << "Execution time: " << double(endTime - startTime) / CLOCKS_PER_SEC << " seconds" << endl;
\tcout << "Expected: "{{printExpected}}
\tcout << "Received: "{{printAnswer}}
\tcout << "Result: ";
\tif (double(endTime - startTime) / CLOCKS_PER_SEC >= 1) {
\t\tcout << "Time limited exceeded" << endl;
\t} else if (answer != expected) {
\t\tcout << "Wrong Answer" << endl;
\t} else {
\t\tcout << "Correct!" << endl << endl;
\t\treturn true;
\t}
\tcout << endl;
\treturn false;
}
`;