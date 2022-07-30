'use strict';

let solutionTemplate;

let templateClassName = '';
let funcArr = [];

let isContestPage = true;
let insertSelector = '';
let codeSelector = '';
let sampleSelector = '';

let regexInput = '';
let regexOutput = '';

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

function ready() {
  insertSelector = '.question-content';
  codeSelector = '.CodeMirror-line';
  sampleSelector = '.question-content > pre';
  regexInput = /Input[:]?((?:.|\n)*)Output/i;
  regexOutput = /Output[:]?[\s\n]*([\S ]+)[\s\n]*(?:Explanation)?/i;
  if (location.host.indexOf("leetcode.cn") !== -1) {
    regexInput = /输入[：:]?((?:.|\n)*)输出/i;
    regexOutput = /输出[：:]?[\s\n]*([\S ]+)[\s\n]*(?:解释)?/i;
  }
  if (location.href.indexOf("/contest/") === -1) {
    isContestPage = false;
    insertSelector = '.css-1rngd9y-ZoomWrapper';
    codeSelector = '.monaco-mouse-cursor-text';
    sampleSelector = '.notranslate > pre';
  }
}

function isSupportedType(type) {
  let supportedTypes = ['bool', 'int', 'long long', 'float', 'double', 'string'];
  if (supportedTypes.indexOf(type) !== -1) {
    return true;
  }
  if (type.match(regexVectorType) != null) {
    return true;
  }
  return false;
}

function removeReference(s) {
  return s.replace(/&/g, '');
}

class Func {
	constructor(funcName, outputType, inputs, variables, startIndex, endIndex) {
		this.funcName = funcName;
		this.outputType = outputType;
		this.inputs = inputs;
		this.variables = variables;
		this.startIndex = startIndex;
		this.endIndex = endIndex;
		this.printExpected = '';
		this.printAnswer = '';
		if (outputType === 'void') {
		  this.outputType = null;
    }
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
    let inputs = funcMatch[2].trim();
		let varsArr = funcMatch[2].trim().split(/\s*,\s*/);
		let variables = [];
		if (inputs === '') {
		  return new Func(funcName, outputType, inputs, variables, startIndex, endIndex);
    }
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

  getInput(input) {
    let regex = '';
    for (let i = 0; i < this.variables.length; i++) {
      let name = this.variables[i].name;
      let type = this.variables[i].type;
      regex += '(?:' + name + '[\\s\\n]*[=:][\\s\\n]*)?';
      switch (true) {
        case type === 'bool':
          regex += '(' + regexBool + ')';
          break;
        case type === 'int' || type === 'long long':
          regex += '(' + regexInt + ')';
          break;
        case type === 'float' || type === 'double':
          regex += '(' + regexFloat + ')';
          break;
        case type === 'string':
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
    for (let i = 0; i < this.variables.length; i++) {
      let content = matched[i + 1];
      if (this.variables[i].isVector) {
        content = content.replace(/\[/g, '{');
        content = content.replace(/\]/g, '}');
      }
      result.push(this.variables[i].name + ' = ' + content + ';');
    }
    return result;
  }

  getOutput(output) {
    let value = '';
    let isVector = false;
    switch (true) {
      case this.outputType === 'bool':
        value = output.match(RegExp(regexBool, 'i'))[0].toLowerCase();
        break;
      case this.outputType === 'int' || this.outputType === 'long long':
        value = output.match(RegExp(regexInt, 'i'))[0];
        break;
      case this.outputType === 'float' || this.outputType === 'double':
        value = output.match(RegExp(regexFloat, 'i'))[0];
        break;
      case this.outputType === 'string':
        value = output.match(RegExp(regexString, 'i'))[0];
        break;
      case this.outputType === 'char':
        value = output.match(RegExp(regexString, 'i'))[0];
        value = "'" + value[1] + "'";
        break;
      case this.outputType && this.outputType.match(RegExp(regexVectorType, 'i')) != null:
        isVector = true;
        value = output.match(regexCapture)[1];
        break;
    }
    let result = [];
    if (!isVector) {
      result.push('expected = ' + value + ';');
    } else {
      let vectorType = this.outputType.match(regexVectorType)[1];
      result.push(vectorType + ' outVec[] = {' + value + '};');
      result.push('expected.assign(outVec, outVec + sizeof(outVec) / sizeof(outVec[0]));');
    }
    return result;
  }

  genPrintExpected() {
    if (this.outputType && this.outputType.match(regexVectorType) != null) {
      // Output is vector
      this.printExpected = ' << "{ ";\n';
      this.printExpected += '\tfor (int i = 0; i < expected.size(); i++) {\n';
      this.printExpected += '\t\tcout << expected[i] << (i == (int)expected.size() - 1 ? " }\\n" : ", ");\n';
      this.printExpected += '\t}';
      this.printAnswer = this.printExpected.replace(/expected/g, 'answer');
    } else {
      // Output is regular variable.
      this.printExpected = ' << expected << endl;';
      this.printAnswer = ' << answer << endl;';
    }
  }

  getInputArgs() {
	  return this.variables.map(function(v) { return v.name; });
  }

  getVarDeclaration() {
	  let code = '';
    for (let i = 0; i < this.variables.length; i++) {
      code += '\t' + removeReference(this.variables[i].type) + ' ' + this.variables[i].name + ';\n';
    }
    code += '\t' + this.outputType + ' expected;\n';
    return code;
  }

  getRunTest(runTest) {
    runTest = runTest.replace(/{{className}}/g, templateClassName);
    runTest = runTest.replace(/{{inputs}}/g, this.inputs);
    runTest = runTest.replace(/{{outputType}}/g, this.outputType);
    runTest = runTest.replace(/{{funcName}}/g, this.funcName);
    runTest = runTest.replace(/{{inputArgs}}/g, this.getInputArgs().join(', '));
    runTest = runTest.replace(/{{printExpected}}/g, this.printExpected);
    runTest = runTest.replace(/{{printAnswer}}/g, this.printAnswer);
    return runTest;
  }

}

function parseSolutionTemplate() {
  let problemType = PROBLEM_TYPE.UNKNOWN;
  solutionTemplate = '';
  $(codeSelector).each(function(index, element) {
    solutionTemplate += $(element).text() + '\n';
  });
  if (!isContestPage) {
    solutionTemplate = solutionTemplate.replace('public:', 'public:\n');
    solutionTemplate = solutionTemplate.replace(/\{/g, '{\n');
    solutionTemplate = solutionTemplate.replace(/\}/g, '}\n');
  }

  if (solutionTemplate.match(/struct TreeNode/) != null) {
    error('Problems with TreeNode are not yet supported.');
    return PROBLEM_TYPE.UNKNOWN;
  }

  solutionTemplate = solutionTemplate.replace(/\/\*\*(.|\n)*\*\/\n/g, '');
  solutionTemplate = solutionTemplate.replace(/\u00A0/g, ' ');
  solutionTemplate = solutionTemplate.replace(/\u200B/g, '');
  solutionTemplate = solutionTemplate.replace(/    /g, '\t');
  if (!isContestPage) {
    solutionTemplate = solutionTemplate.replace(/\}\n\t\t/g, '}\n\t');
    solutionTemplate = solutionTemplate.replace(/\{\n\t\t\t/g, '{\n\t');
  }

  // Parse class
  let classNameMatch = solutionTemplate.match(/^class\s+(\S+)/);
  if (classNameMatch == null) {
    return PROBLEM_TYPE.UNKNOWN;
  }
  templateClassName = classNameMatch[1];

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

  if (templateClassName === "Solution") {
    problemType = PROBLEM_TYPE.GENERAL;
  } else if (templateClassName === funcArr[0].funcName) {
    problemType = PROBLEM_TYPE.IMPLEMENT_CLASS;
  } else {
    return PROBLEM_TYPE.UNKNOWN;
  }

  funcArr[0].genPrintExpected();
  return problemType;
}

function parseSampleCase(content) {
  let input = content.match(regexInput);
  let output = content.match(regexOutput);
  if (input == null || output == null) {
    return null;
  }
  return {
    input: input[1].trim(),
    output: output[1].trim()
  };
}

function process() {
  let problemType = parseSolutionTemplate()

  let finalCode = headerTemplate + '\n' + solutionTemplate + '\n';

  switch (problemType) {
    case PROBLEM_TYPE.GENERAL:
      finalCode += genCodeGeneral();
      break;
    case PROBLEM_TYPE.IMPLEMENT_CLASS:
      finalCode += genCodeImplementClass();
      break;
  }

  finalCode += '\tif (!allSuccess) cout << "Some cases did not pass." << endl;\n';
  finalCode += '\telse cout << "All samples succeeded! :)" << endl;\n';
  finalCode += '\treturn 0;\n}\n'; // end testing main function

  $('<pre id="leet-compete-code"></pre>').text(finalCode)
    .insertAfter(insertSelector).hide();
}

function genCodeGeneral() {
  let codeContent = '';
  codeContent += funcArr[0].getRunTest(runTest) + '\n';

  codeContent += 'int main() {\n'; // Start testing main function
  codeContent += '\tbool allSuccess = true;\n'
  codeContent += funcArr[0].getVarDeclaration();

  let testNum = 0;
  $(sampleSelector).each(function(index, pre) {
    let inout = parseSampleCase($(pre).text());
    if (inout) {
      testNum++;
      let testBlock = '\t{\n';
      testBlock += '\t\t' + funcArr[0].getInput(inout.input).join('\n\t\t') + '\n';
      testBlock += '\t\t' + funcArr[0].getOutput(inout.output).join('\n\t\t') + '\n';
      testBlock += '\t\tbool success = runTest(' + testNum + ', ' + funcArr[0].getInputArgs().join(', ') + ', expected);\n';
      testBlock += '\t\tallSuccess &= success;\n';
      testBlock += '\t}\n';

      codeContent += testBlock;
    }
  });
  if (testNum === 0) {
    error('Failed to parse sample case');
  }
  return codeContent;
}

function parseVector(input) {
  input = input.trim();
  if (input === '') return null;
  let cnt = 0;
  let start = 0;
  let result = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '[') {
      cnt++;
      if (cnt === 1) {
        start = i+1;
      }
    } else if (input[i] === ']') {
      cnt--;
      if (cnt === 0) {
        let subRes = parseVector(input.substr(start, i - start));
        if (subRes != null) {
          result.push(subRes);
				} else {
					result.push([]);
        }
      }
    }
  }
  if (result.length === 0) {
    return input.split(/\s*,\s*/);
  }
  return result
}

function getFuncRunCode(func, inputArgs, expected, is_constructor) {
    let codeContent = '\t{\n';
    for (let i = 0; i < inputArgs.length; i++) {
      let v = func.variables[i];
      if (v.isVector) {
        codeContent += '\t\t' + removeReference(v.type) + ' ' + v.name + ' = {' + inputArgs[i] + '};\n';
      }
    }
    codeContent += '\t\t';
    if (is_constructor) {
      codeContent += 'sol = new ';
    } else if (func.outputType) {
      codeContent += removeReference(func.outputType) + ' answer = sol->';
    } else {
      codeContent += 'sol->';
    }
    codeContent += func.funcName + '(';
    for (let i = 0; i < inputArgs.length; i++) {
      if (i) codeContent += ', ';
      let v = func.variables[i];
      codeContent += (v.isVector ? v.name : inputArgs[i]);
    }
    codeContent += ');\n';
    if (func.outputType) {
      codeContent += '\t\t' + removeReference(func.outputType) + ' expected = ' + expected + ';\n';
      codeContent += '\t\tcout << "Expected: " << answer << endl;\n';
      codeContent += '\t\tcout << "Received: " << expected << endl;\n';
      codeContent += '\t\tcout << "Result: ";\n';
      codeContent += '\t\tbool success = true;\n';
      codeContent += '\t\tif (answer != expected) {\n';
      codeContent += '\t\t\tcout << "Wrong Answer" << endl << endl;\n';
      codeContent += '\t\t\tsuccess = false;\n';
      codeContent += '\t\t} else {\n';
      codeContent += '\t\t\tcout << "Correct!" << endl << endl;\n';
      codeContent += '\t\t}\n';
      codeContent += '\t\tallSuccess &= success;\n';
    }
    codeContent += '\t}\n';
    return codeContent;
}

function parseInputImplementClass(inout) {
  let inputArr = parseVector(inout.input);
  let outputArr = parseVector(inout.output);
  if (inputArr.length !== 2 || inputArr[0].length !== inputArr[1].length) {
    return '';
  }
  let funcDict = {};
  for (let i = 0; i < funcArr.length; i++) {
    let func = funcArr[i];
    funcDict[func.funcName] = func;
  }
  let codeContent = '';
  for (let i = 0; i < inputArr[0].length; i++) {
    let funcName = inputArr[0][i].replace(/"/g, '');
    codeContent += getFuncRunCode(funcDict[funcName], inputArr[1][i], outputArr[0][i], i === 0);
  }
  return codeContent;
}

function genCodeImplementClass() {
  let codeContent = '';
  codeContent += 'int main() {\n'; // Start testing main function
  codeContent += '\tbool allSuccess = true;\n'

  codeContent += '\t' + templateClassName + '* sol;\n';
  $(sampleSelector).each(function(index, pre) {
    let inout = parseSampleCase($(pre).text());
    if (inout) {
      codeContent += parseInputImplementClass(inout);
    }
  });
  return codeContent;
}

ready();
if (isContestPage) {
  process();
  addButtons(process);
} else {
  setTimeout(function() {
    process();
    addButtons(process);
  }, 9000);
}
