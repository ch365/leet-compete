'use strict';

let solutionTemplate;

let funcArr = [];

let inputs;
let variables = [];
let outputType = '';
let funcName = '';

let codeSelector = '.ace_content';
let printExpected = '';
let printAnswer = '';

let regexInput = /Input:((?:.|\n)*)Output/i;
let regexOutput = /Output:[\s\n]*(\S+)[\s\n]+(?:Explanation|$)/i;

let regexBool = '(true|false|0|1)';
let regexInt = '-?\\d+';
let regexFloat = '(?:\\d+\\.)\\d+f?';
let regexString = '\\".*\\"';
let regexVector = '\\[.*\\]';
let regexCapture = '\\[(.*)\\]';

let regexVectorType = 'vector<(.*)>';

const PROBLEM_TYPE = {
  "UNKNOWN": 0,
  "GENERAL": 1,
  "IMPLEMENT_CLASS": 2,
};

function isSupportedType(type) {
  let supportedTypes = ['bool', 'int', 'long long', 'float', 'double', 'string'];
  if (supportedTypes.indexOf(type) != -1) {
    return true;
  }
  if (type.match(regexVectorType) != null) {
    return true;
  }
  return false;
}

class Func {
	constructor(funcName, outputType, inputs, variables, startIndex, endIndex) {
		this.funcName = funcName;
		this.outputType = outputType;
		this.inputs = inputs;
		this.variables = variables;
		this.startIndex = startIndex;
		this.endIndex = endIndex;
	}
	static parseFunction (strTemplate, startIndex) {
		let funcMatch = strTemplate.substr(startIndex).match(/\s+(.*)\((.*)\)\s*\{/);
		if (funcMatch == null) {
			return null;
		}
		startIndex += funcMatch['index'];
		let endIndex = startIndex + funcMatch[0].length;

    // Parse output type and func name
		let outputType = null, funcName = ''
		let funcNameArr = funcMatch[1].trim().split(/\s+/);
		if (funcNameArr.length === 1) {
			funcName = funcNameArr[0];
		} else if (funcNameArr.length === 2) {
			outputType = funcNameArr[0];
			funcName = funcNameArr[1];
		} else {
		  return null;
    }

		// Parse input variables
    let inputs = funcMatch[2];
		let varsArr = funcMatch[2].trim().split(/\s*,\s*/);
		let variables = [];
		for (let i = 0; i < varsArr.length; i++) {
			let v = varsArr[i];
			let tokens = v.split(/\s+/);
			let type = tokens[0], name = tokens[1];
			if (!isSupportedType(type)) {
				error('Input variable type is not supported by Leet-Compete.');
				return null;
			}
			variables.push({
				name: name,
				type: type,
				isVector: type.match(regexVectorType) != null
			});
		}
		return new Func(funcName, outputType, inputs, variables, startIndex, endIndex);
	}
}

function parseSolutionTemplate() {
  let problemType = PROBLEM_TYPE.UNKNOWN;
  solutionTemplate = '';
  $('.CodeMirror-line').each(function(index, element) {
    solutionTemplate += $(element).text() + '\n';
    // console.log("--- solutionTemplate step", element);
  });

  if (solutionTemplate.match(/struct TreeNode/) != null) {
    error('Problems with TreeNode are not yet supported.');
    return PROBLEM_TYPE.UNKNOWN;
  }

  solutionTemplate = solutionTemplate.replace(/\/\*\*(.|\n)*\*\/\n/g, '');
  solutionTemplate = solutionTemplate.replace(/\u00A0/g, ' ');
  solutionTemplate = solutionTemplate.replace(/    /g, '\t');

  // Parse class
  let classNameMatch = solutionTemplate.match(/^class\s+(\S+)/);
  if (classNameMatch == null) {
    return PROBLEM_TYPE.UNKNOWN;
  }
  let className = classNameMatch[1];

  // Parse function
  let publicMatch = solutionTemplate.match(/public:/);
  let startIndex = publicMatch['index'] + publicMatch[0].length;
  while (true) {
    let func = Func.parseFunction(solutionTemplate, startIndex);
    if (func == null) {
      break;
    }
    startIndex = func.endIndex;
    funcArr.push(func);
  }
  if (funcArr.length === 0) {
    return PROBLEM_TYPE.UNKNOWN;
  }

  inputs = funcArr[0].inputs;
  variables = funcArr[0].variables;
  outputType =  funcArr[0].outputType;
  funcName =  funcArr[0].funcName;

  if (className === "Solution") {
    problemType = PROBLEM_TYPE.GENERAL;
  } else if (className === funcArr[0].funcName) {
    problemType = PROBLEM_TYPE.IMPLEMENT_CLASS;
  } else {
    return PROBLEM_TYPE.UNKNOWN;
  }


  if (outputType.match(regexVectorType) != null) {
    // Output is vector
    printExpected = ' << "{ ";\n';
    printExpected += '\tfor (int i = 0; i < expected.size(); i++) {\n';
    printExpected += '\t\tcout << expected[i] << (i == (int)expected.size() - 1 ? " }\\n" : ", ");\n';
    printExpected += '\t}';
    printAnswer = printExpected.replace(/expected/g, 'answer');
  } else {
    // Output is regular variable.
    printExpected = ' << expected << endl;';
    printAnswer = ' << answer << endl;';
  }
  return problemType;
}

function getVector(variable, input) {
  let elementType = variable.type.match(/vector<\s*(.*)\s*>/)[1];
  let result = [];
  result.push(elementType + ' vec[] = { ' + input.match(/\[(.*)\]/i)[1] + ' };');
  result.push(variable.name + '.assign(vec, vec + sizeof(vec) / sizeof(vec[0]));');
  return result;
}

function getInput(input) {
  let regex = '';
  for (let i = 0; i < variables.length; i++) {
    let name = variables[i].name;
    let type = variables[i].type;
    regex += '(?:' + name + '[\\s\\n]*[=:][\\s\\n]*)?';
    switch (true) {
      case type == 'bool':
        regex += '(' + regexBool + ')';
        break;
      case type == 'int' || type == 'long long':
        regex += '(' + regexInt + ')';
        break;
      case type == 'float' || type == 'double':
        regex += '(' + regexFloat + ')';
        break;
      case type == 'string':
        regex += '(' + regexString + ')';
        break;
      case type.match(regexVectorType) != null:
        regex += '(' + regexVector + ')';
        break;
    }
    regex += '[\\s\\n,;]*';
  }
  let result = [];
  let matched = input.match(RegExp(regex, 'i'));
  if (matched == null) {
    error('getInput exception');
    return [];
  }
  for (let i = 0; i < variables.length; i++) {
    let content = matched[i + 1];
    if (!variables[i].isVector) {
      result.push(variables[i].name + ' = ' + content + ';');
    } else {
      result = result.concat(getVector(variables[i], content));
    }
  }
  return result;
}

function getOutput(output) {
  // console.log("--- output", output);
  let value = '';
  let isVector = false;
  switch (true) {
    case outputType == 'bool':
      value = output.match(RegExp(regexBool, 'i'))[0].toLowerCase();
      break;
    case outputType == 'int' || outputType == 'long long':
      value = output.match(RegExp(regexInt, 'i'))[0];
      break;
    case outputType == 'float' || outputType == 'double':
      value = output.match(RegExp(regexFloat, 'i'))[0];
      break;
    case outputType == 'string':
      value = output.match(RegExp(regexString, 'i'))[0];
      break;
    case outputType == 'char':
      value = output.match(RegExp(regexString, 'i'))[0];
      value = "'" + value[1] + "'";
      break;
    case outputType.match(RegExp(regexVectorType, 'i')) != null:
      isVector = true;
      value = output.match(regexCapture)[1];
      break;
  }
  let result = [];
  if (!isVector) {
    result.push('expected = ' + value + ';');
  } else {
    let vectorType = outputType.match(regexVectorType)[1];
    result.push(vectorType + ' outVec[] = {' + value + '};');
    result.push('expected.assign(outVec, outVec + sizeof(outVec) / sizeof(outVec[0]));');
  }
  return result;
}

function findVariables(testNum, content) {
  let input = content.match(regexInput);
  let output = content.match(regexOutput);
  // console.log("--- findVariables", content, input, output);
  if (input == null || output == null) {
    return null;
  }
  input = input[1];
  output = output[1];
  return {
   input: getInput(input),
   output: getOutput(output)
  };
}

function removeReference(s) {
  return s.replace(/&/g, '');
}

function ready() {
  if (location.host.indexOf("leetcode.cn") !== -1) {
    regexInput = /输入[：:]((?:.|\n)*)输出/i;
    regexOutput = /输出[：:][\s\n]*(\S+)[\s\n]+(?:解释|$)/i;
  }
}

function process() {
  let problemType = parseSolutionTemplate()
  switch (problemType) {
    case PROBLEM_TYPE.GENERAL:
      processGeneral();
      break;
    case PROBLEM_TYPE.IMPLEMENT_CLASS:
      break;
  }
}

function processGeneral() {
  let inputArgs = variables.map(function(v) {
    return v.name;
  });

  let finalCode = headerTemplate + '\n' + solutionTemplate + '\n';

  runTest = runTest.replace('{{inputs}}', funcArr[0].inputs);
  runTest = runTest.replace('{{outputType}}', funcArr[0].outputType);
  runTest = runTest.replace('{{funcName}}', funcArr[0].funcName);
  runTest = runTest.replace('{{inputArgs}}', inputArgs.join(', '));
  runTest = runTest.replace('{{outputType}}', outputType);
  runTest = runTest.replace('{{printExpected}}', printExpected);
  runTest = runTest.replace('{{printAnswer}}', printAnswer);

  finalCode += runTest + '\n';

  finalCode += 'int main() {\n'; // Start testing main function
  finalCode += '\tbool allSuccess = true;\n'

  for (let i = 0; i < variables.length; i++) {
    finalCode += '\t' + removeReference(variables[i].type) + ' ' + variables[i].name + ';\n';
  }
  finalCode += '\t' + outputType + ' expected;\n';

  let testNum = 0;
  $('.question-content > pre').each(function(index, pre) {
    let inout = findVariables(testNum, $(pre).text());
    if (inout) {
      testNum++;
      let testBlock = '\t{\n';
      testBlock += '\t\t' + inout.input.join('\n\t\t') + '\n';
      testBlock += '\t\t' + inout.output.join('\n\t\t') + '\n';
      testBlock += '\t\tbool success = runTest(' + testNum + ', ' + inputArgs.join(', ') + ', expected);\n';
      testBlock += '\t\tallSuccess &= success;\n';
      testBlock += '\t}\n';

      finalCode += testBlock;
    }
  });
  if (testNum === 0) {
    error('Failed to parse sample case');
  }
  
  finalCode += '\tif (!allSuccess) cout << "Some cases did not pass." << endl;\n';
  finalCode += '\telse cout << "All samples succeeded! :)" << endl;\n';
  finalCode += '\treturn 0;\n}\n'; // end testing main function
  
  $('<pre id="leet-compete-code"></pre>').text(finalCode)
    .insertAfter('.question-content').hide();
}

ready();
process();
addButtons();
