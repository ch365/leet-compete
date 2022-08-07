'use strict';

let solutionTemplate;

let templateClassName = '';
let funcArr = [];
let inf = 1<<30;

let isContestPage = true;
let insertSelector = '';
let codeSelector = '';
let sampleSelector = '';

let regexInput = '';
let regexOutput = '';
let explanation = '';

let regexBool = '(true|false|0|1)';
let regexInt = '-?\\d+';
let regexFloat = '(?:\\d+\\.)\\d+f?';
let regexString = '\\".*\\"';
let regexCapture = '\\[(.*)\\]';

let regexVectorType = 'vector<(.*)>';

const PROBLEM_TYPE = {
  "UNKNOWN": 0,
  "GENERAL": 1,
  "IMPLEMENT_CLASS": 2,
  "VOID_RETURN": 3,
  "LIST_NODE": 4,
  "TREE_NODE": 5,
};

function ready() {
  insertSelector = '.question-content';
  codeSelector = '.CodeMirror-line';
  sampleSelector = '.question-content > pre';
  regexInput = /Input[:]?((?:.|\n)*)Output/i;
  regexOutput = /Output[:]?[\s\n]*([\S\s\n]+)/i;
  explanation = "Explanation";
  if (location.host.indexOf("leetcode.cn") !== -1) {
    regexInput = /输入[：:]?((?:.|\n)*)输出/i;
    regexOutput = /输出[：:]?[\s\n]*([\S\s\n]+)/i;
    explanation = "解释";
  }
  if (location.href.indexOf("/contest/") === -1) {
    isContestPage = false;
    insertSelector = '.css-1rngd9y-ZoomWrapper';
    codeSelector = '.monaco-mouse-cursor-text';
    sampleSelector = '.notranslate > pre';
  }
}

function isSupportedType(type) {
  let supportedTypes = ['bool', 'int', 'long long', 'float', 'double', 'string', 'ListNode*', 'TreeNode*'];
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

function getTypeAndName(s) {
  s = s.trim();
  let arr = s.split(/\s+/);
  let n = arr.length;
  let name = arr[n - 1];
  let type = s.substr(0, s.length-name.length).trim();
  if (type === "") {
    type = null;
  }
  return {
    name: name,
    type: type
  }
}


class Variable {
	constructor(name, type) {
	  this.name = name;
	  this.type = type;
	  this.isVector = type.match(regexVectorType) != null;
	  this.originalType = type;
  }

	getValue(value) {
    if (!this.isVector) {
      return value;
    }
    value = value.replace(/\n/g, '');
    value = value.replace(/\[/g, '{');
    value = value.replace(/\]/g, '}');
    if (this.type.includes('char')) {
      value = value.replace(/"/g, "'");
    }
    if (this.originalType === 'TreeNode*') {
      value = value.replace(/null/g, inf.toString());
    }
    return value;
  }
}

class Func {
	constructor(funcName, outputType, inputs, variables, startIndex, endIndex) {
		this.funcName = funcName;
		this.outputVar = new Variable('', outputType);
		this.inputs = inputs;
		this.variables = variables;
		this.startIndex = startIndex;
		this.endIndex = endIndex;
		this.printExpected = '';
		this.printAnswer = '';
		if (outputType === 'void') {
      this.outputVar.type = null;
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
    let funcTypeAndName = getTypeAndName(funcMatch[1]);
    let funcName = funcTypeAndName.name
    let outputType = funcTypeAndName.type

		// Parse input variables
    let inputs = funcMatch[2].trim();
		let varsArr = funcMatch[2].trim().split(/\s*,\s*/);
		let variables = [];
		if (inputs === '') {
		  return new Func(funcName, outputType, inputs, variables, startIndex, endIndex);
    }
		for (let i = 0; i < varsArr.length; i++) {
			let typeAndName = getTypeAndName(varsArr[i]);
			if (!isSupportedType(typeAndName.type)) {
				error('Input variable type is not supported by Leet-Compete.');
				return null;
			}
			variables.push(new Variable(typeAndName.name, typeAndName.type));
		}
		return new Func(funcName, outputType, inputs, variables, startIndex, endIndex);
	}

	fixVoidOutput() {
    for (let i = 0; i < this.variables.length; i++) {
		  if (this.variables[i].isVector) {
		    this.outputVar.type = removeReference(this.variables[i].type);
		    this.outputVar.name = this.variables[i].name;
		    this.outputVar.isVector = true;
		    break;
      }
    }
  }

  handleNodeType() {
	  if (['ListNode*', 'TreeNode*'].includes(this.outputVar.type)) {
	    this.outputVar.type = 'vector<int>';
	    this.outputVar.isVector = true;
    }
    for (let i = 0; i < this.variables.length; i++) {
      if (['ListNode*', 'TreeNode*'].includes(this.variables[i].type)) {
        this.variables[i].type = 'vector<int>';
        this.variables[i].isVector = true;
      }
    }
  }

  getInput(input) {
    let inputArr = [];
    for (let i = 0; i < this.variables.length; i++) {
      let name = this.variables[i].name;
      let matched = input.match(RegExp(name + '[\\s\\n]*[=:]', 'i'));
      if (matched == null) {
        error('getInput exception');
        return [];
      }
      let startIndex = matched['index'];
      let endIndex = startIndex + matched[0].length;
      if (i) inputArr.push(input.substr(0, startIndex));
      input = input.substr(endIndex);
    }
    inputArr.push(input);
    let result = [];
    for (let i = 0; i < this.variables.length; i++) {
      let value = inputArr[i].replace(/^(\s|,)+|(\s|,)+$/g, '');
      result.push(this.variables[i].name + ' = ' + this.variables[i].getValue(value) + ';');
    }
    return result;
  }

  getOutput(output) {
    let value = '';
    switch (true) {
      case this.outputVar.type === 'bool':
        value = output.match(RegExp(regexBool, 'i'))[0].toLowerCase();
        break;
      case this.outputVar.type === 'int' || this.outputVar.type === 'long long':
        value = output.match(RegExp(regexInt, 'i'))[0];
        break;
      case this.outputVar.type === 'float' || this.outputVar.type === 'double':
        value = output.match(RegExp(regexFloat, 'i'))[0];
        break;
      case this.outputVar.type === 'string':
        value = output.match(RegExp(regexString, 'i'))[0];
        break;
      case this.outputVar.type === 'char':
        value = output.match(RegExp(regexString, 'i'))[0];
        value = "'" + value[1] + "'";
        break;
      case this.outputVar.isVector:
        value = output.match(regexCapture)[1];
        break;
    }
    let result = [];
    if (!this.outputVar.isVector) {
      result.push('expected = ' + value + ';');
    } else {
      result.push('expected = ' + this.outputVar.getValue(output) + ';');
    }
    return result;
  }

  genPrintExpected() {
    if (this.outputVar.isVector) {
      // Output is vector
      this.printExpected = ' << "{ ";\n';
      this.printExpected += '\tfor (int i = 0; i < expected.size(); i++) {\n';
      if ((this.outputVar.type.match(/vector/g) || []).length > 1) {
        this.printExpected += '\t\tcout << "{";\n';
        this.printExpected += '\t\tfor (int j = 0; j < expected[i].size(); j++) {\n';
        this.printExpected += '\t\t\tcout << expected[i][j] << (j+1 == (int)expected[i].size() ? "" : ", ");\n';
        this.printExpected += '\t\t}\n';
        this.printExpected += '\t\tcout << "}";\n';
        this.printExpected += '\t\tcout << (i+1 == expected.size() ? "" : ",");\n';
      } else {
        if (this.outputVar.originalType === 'TreeNode*') {
          this.printExpected += '\t\texpected[i] == {{inf}} ? cout << "null" : cout << expected[i];\n';
          this.printExpected += '\t\tcout << (i+1 == (int)expected.size() ? "" : ", ");\n';
        } else {
          this.printExpected += '\t\tcout << expected[i] << (i+1 == (int)expected.size() ? "" : ", ");\n';
        }
      }
      this.printExpected += '\t}\n';
      this.printExpected += '\tcout << " }\\n";';
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

  getInputAdjustArgs() {
	  return this.variables.map(function(v) {
	    if (v.originalType === 'ListNode*') {
	      return 'convertViToListNode(' + v.name + ')';
      } else if (v.originalType === 'TreeNode*') {
	      return 'convertViToTreeNode(' + v.name + ')';
      }
	    return v.name;
	  });
  }

  getVarDeclaration() {
	  let code = '';
    for (let i = 0; i < this.variables.length; i++) {
      code += '\t' + removeReference(this.variables[i].type) + ' ' + this.variables[i].name + ';\n';
    }
    code += '\t' + this.outputVar.type + ' expected;\n';
    return code;
  }

  getRunTest(runTest) {
    runTest = runTest.replace(/{{className}}/g, templateClassName);
    runTest = runTest.replace(/{{inputs}}/g, this.inputs);
    runTest = runTest.replace(/{{outputType}}/g, this.outputVar.type);
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

  if (solutionTemplate.match(/struct\sTreeNode/) != null) {
    problemType = PROBLEM_TYPE.TREE_NODE;
  }
  if (solutionTemplate.match(/struct\sListNode/) != null) {
    problemType = PROBLEM_TYPE.LIST_NODE;
  }

  solutionTemplate = solutionTemplate.replace(/\/\*\*(.|\n)*\*\//g, '').trim();
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
  if (publicMatch == null) {
    return PROBLEM_TYPE.UNKNOWN;
  }
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

  if ([PROBLEM_TYPE.LIST_NODE, PROBLEM_TYPE.TREE_NODE].includes(problemType)) {
    funcArr[0].handleNodeType();
  } else if (templateClassName === "Solution") {
    problemType = PROBLEM_TYPE.GENERAL;
  } else if (templateClassName === funcArr[0].funcName) {
    problemType = PROBLEM_TYPE.IMPLEMENT_CLASS;
  } else {
    return PROBLEM_TYPE.UNKNOWN;
  }
  if (funcArr[0].outputVar.type == null) {
    problemType = PROBLEM_TYPE.VOID_RETURN;
    funcArr[0].fixVoidOutput();
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
  let real_output = output[1].trim();
  let index_expl = real_output.indexOf(explanation);
  if (index_expl !== -1) {
    real_output = real_output.substr(0, index_expl).trim();
  }
  return {
    input: input[1].trim(),
    output: real_output
  };
}

function process() {
  let problemType = parseSolutionTemplate()

  let finalCode = headerTemplate + '\n' + solutionTemplate + '\n\n\n';

  switch (problemType) {
    case PROBLEM_TYPE.GENERAL:
      finalCode += genCodeGeneral();
      break;
    case PROBLEM_TYPE.IMPLEMENT_CLASS:
      finalCode += genCodeImplementClass();
      break;
    case PROBLEM_TYPE.VOID_RETURN:
      finalCode += genCodeVoidReturn();
      break;
    case PROBLEM_TYPE.LIST_NODE:
      finalCode += genCodeListNode();
      break;
    case PROBLEM_TYPE.TREE_NODE:
      finalCode += genCodeTreeNode();
      break;
    default:
      console.error("parse solution template failed");
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

function genCodeVoidReturn() {
  let codeContent = '';
  codeContent += "class SolutionWrapper {\n";
  codeContent += "public:\n";
  codeContent += "\t{{outputType}} {{funcName}}({{inputs}}) {\n";
  codeContent += "\t\tSolution *sol = new Solution();\n";
  codeContent += "\t\tsol->{{funcName}}({{inputArgs}});\n";
  codeContent += "\t\treturn {{outputName}};\n";
  codeContent += "\t}\n";
  codeContent += "};\n";
  codeContent = codeContent.replace(/{{outputType}}/g, funcArr[0].outputVar.type);
  codeContent = codeContent.replace(/{{outputName}}/g, funcArr[0].outputVar.name);
  codeContent = codeContent.replace(/{{funcName}}/g, funcArr[0].funcName);
  codeContent = codeContent.replace(/{{inputArgs}}/g, funcArr[0].getInputArgs().join(', '));
  codeContent = codeContent.replace(/{{inputs}}/g, funcArr[0].inputs);
  codeContent += genCodeGeneral().replace(/Solution/g, 'SolutionWrapper');
  return codeContent;
}

function genCodeListNode() {
  let codeContent = '';
  codeContent += "vector<int> convertListNodeToVi(ListNode* head) {\n";
  codeContent += "\tvector<int> a;\n";
  codeContent += "\twhile(head) { a.push_back(head->val); head = head->next; }\n";
  codeContent += "\treturn a;\n";
  codeContent += "}\n\n";
  codeContent += "ListNode* convertViToListNode(vector<int> a) {\n";
  codeContent += "\tListNode* head = nullptr;\n";
  codeContent += "\treverse(a.begin(), a.end());\n";
  codeContent += "\tfor (auto v: a) head = new ListNode(v, head);\n";
  codeContent += "\treturn head;\n";
  codeContent += "}\n\n";
  codeContent += "class SolutionWrapper {\n";
  codeContent += "public:\n";
  codeContent += "\t{{outputType}} {{funcName}}({{inputsAdjust}}) {\n";
  codeContent += "\t\tSolution *sol = new Solution();\n";
  codeContent += "\t\t{{outputOriginalType}} answer = sol->{{funcName}}({{inputArgs}});\n";
  codeContent += "\t\treturn {{outputName}};\n";
  codeContent += "\t}\n";
  codeContent += "};\n";
  codeContent = codeContent.replace(/{{outputOriginalType}}/g, funcArr[0].outputVar.originalType);
  let outputName = (funcArr[0].outputVar.originalType === "ListNode*" ? "convertListNodeToVi(answer)" : "answer");
  codeContent = codeContent.replace(/{{outputName}}/g, outputName);
  codeContent = codeContent.replace(/{{outputType}}/g, funcArr[0].outputVar.type);
  codeContent = codeContent.replace(/{{funcName}}/g, funcArr[0].funcName);
  codeContent = codeContent.replace(/{{inputArgs}}/g, funcArr[0].getInputAdjustArgs().join(', '));
  codeContent = codeContent.replace(/{{inputs}}/g, funcArr[0].inputs);
  codeContent = codeContent.replace(/{{inputsAdjust}}/g, funcArr[0].inputs.replace(/ListNode\*/g, 'vector<int>'));
  codeContent += genCodeGeneral().replace(/Solution/g, 'SolutionWrapper')
    .replace(/ListNode\*/g, 'vector<int>');
  return codeContent;
}

function genCodeTreeNode() {
  let codeContent = '';
  codeContent += "vector<int> convertTreeNodeToVi(TreeNode* root) {\n";
  codeContent += "\tvector<int> a;\n";
  codeContent += "\tqueue<TreeNode*> q;\n";
  codeContent += "\tif (root) q.push(root);\n";
  codeContent += "\twhile(not q.empty()) {\n";
  codeContent += "\t\tauto cur = q.front(); q.pop();\n";
  codeContent += "\t\tif (not cur) { a.push_back({{inf}}); continue; }\n";
  codeContent += "\t\tif (cur->left or cur->right) {q.push(cur->left); q.push(cur->right);}\n";
  codeContent += "\t\ta.push_back(cur->val);\n";
  codeContent += "\t}\n";
  codeContent += "\twhile(a.size() and a[a.size()-1]=={{inf}}) a.pop_back();\n";
  codeContent += "\treturn a;\n";
  codeContent += "}\n\n";
  codeContent += "TreeNode* convertViToTreeNode(vector<int> a) {\n";
  codeContent += "\tqueue<TreeNode*> q;\n";
  codeContent += "\tTreeNode* root = nullptr;\n";
  codeContent += "\tint n = a.size();\n";
  codeContent += "\tfor (int i = 0; i < n; i++) {\n";
  codeContent += "\t\tif (q.empty()) {\n";
  codeContent += "\t\t\troot = new TreeNode(a[i]); q.push(root);\n";
  codeContent += "\t\t} else {\n";
  codeContent += "\t\t\tauto cur = q.front(); q.pop();\n";
  codeContent += "\t\t\tif (a[i] != {{inf}}) {cur->left = new TreeNode(a[i]); q.push(cur->left);}\n";
  codeContent += "\t\t\tif (++i < n and a[i] != {{inf}}) {cur->right = new TreeNode(a[i]); q.push(cur->right);}\n";
  codeContent += "\t\t}\n";
  codeContent += "\t}\n";
  codeContent += "\treturn root;\n";
  codeContent += "}\n\n";
  codeContent += "class SolutionWrapper {\n";
  codeContent += "public:\n";
  codeContent += "\t{{outputType}} {{funcName}}({{inputsAdjust}}) {\n";
  codeContent += "\t\tSolution *sol = new Solution();\n";
  codeContent += "\t\t{{outputOriginalType}} answer = sol->{{funcName}}({{inputArgs}});\n";
  codeContent += "\t\treturn {{outputName}};\n";
  codeContent += "\t}\n";
  codeContent += "};\n";
  codeContent = codeContent.replace(/{{outputOriginalType}}/g, funcArr[0].outputVar.originalType);
  let outputName = (funcArr[0].outputVar.originalType === "TreeNode*" ? "convertTreeNodeToVi(answer)" : "answer");
  codeContent = codeContent.replace(/{{outputName}}/g, outputName);
  codeContent = codeContent.replace(/{{outputType}}/g, funcArr[0].outputVar.type);
  codeContent = codeContent.replace(/{{funcName}}/g, funcArr[0].funcName);
  codeContent = codeContent.replace(/{{inputArgs}}/g, funcArr[0].getInputAdjustArgs().join(', '));
  codeContent = codeContent.replace(/{{inputs}}/g, funcArr[0].inputs);
  codeContent = codeContent.replace(/{{inputsAdjust}}/g, funcArr[0].inputs.replace(/TreeNode\*/g, 'vector<int>'));
  codeContent += genCodeGeneral().replace(/Solution/g, 'SolutionWrapper')
    .replace(/TreeNode\*/g, 'vector<int>');
  codeContent = codeContent.replace(/{{inf}}/g, inf.toString());
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
    } else if (func.outputVar.type) {
      codeContent += removeReference(func.outputVar.type) + ' answer = sol->';
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
    if (func.outputVar.type) {
      codeContent += '\t\t' + removeReference(func.outputVar.type) + ' expected = ' + expected + ';\n';
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
  let limit = 20
  let handle = setInterval(function() {
    limit--;
    if (($(insertSelector).length && $(codeSelector).length && $(sampleSelector).length) || limit <= 0) {
      clearInterval(handle);
      process();
      addButtons(process);
    }
  }, 500);
}