var runTest = `
bool runTest(int testNum, {{inputs}}, {{outputType}} expected) {
\t{{className}} *sol = new {{className}}();
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

var utilsFuncCode = `
#include <sstream>
template<typename T>
string vecToStr(vector<T> a) {
\tif (a.size() == 0) return "{}";
\tostringstream oss;
\tfor (int i = 0; i < a.size(); ++i) oss << (i ? ", " : "") << {{a[i]}};
\treturn "{" + oss.str() + "}";
}
template<typename T>
string vecToStr(vector<vector<T>> a) {
\tif (a.size() == 0) return "{}";
\tstring ans = "{";
\tfor (int i = 0; i < a.size(); ++i) ans += (i ? ", " : "") + vecToStr(a[i]);
\treturn ans + "}";
}
`;

var voidReturnCode = `
class SolutionWrapper {
public:
\t{{outputType}} {{funcName}}({{inputs}}) {
\t\tSolution *sol = new Solution();
\t\tsol->{{funcName}}({{inputArgs}});
\t\treturn {{outputName}};
\t}
};
`;

var listNodeCode = `
vector<int> convertListNodeToVi(ListNode* head) {
\tvector<int> a;
\twhile(head) { a.push_back(head->val); head = head->next; }
\treturn a;
}
ListNode* convertViToListNode(vector<int> a) {
\tListNode* head = nullptr;
\treverse(a.begin(), a.end());
\tfor (auto v: a) head = new ListNode(v, head);
\treturn head;
}
class SolutionWrapper {
public:
\t{{outputType}} {{funcName}}({{inputsAdjust}}) {
\t\tSolution *sol = new Solution();
\t\t{{outputOriginalType}} answer = sol->{{funcName}}({{inputArgs}});
\t\treturn {{outputName}};
\t}
};
`;

var treeNodeCode = `
vector<int> convertTreeNodeToVi(TreeNode* root) {
\tvector<int> a;
\tqueue<TreeNode*> q;
\tif (root) q.push(root);
\twhile(not q.empty()) {
\t\tauto cur = q.front(); q.pop();
\t\tif (not cur) { a.push_back({{inf}}); continue; }
\t\tif (cur->left or cur->right) {q.push(cur->left); q.push(cur->right);}
\t\ta.push_back(cur->val);
\t}
\twhile(a.size() and a[a.size()-1]=={{inf}}) a.pop_back();
\treturn a;
}
TreeNode* convertViToTreeNode(vector<int> a) {
\tqueue<TreeNode*> q;
\tTreeNode* root = nullptr;
\tint n = a.size();
\tfor (int i = 0; i < n; i++) {
\t\tif (q.empty()) {
\t\t\troot = new TreeNode(a[i]); q.push(root);
\t\t} else {
\t\t\tauto cur = q.front(); q.pop();
\t\t\tif (a[i] != {{inf}}) {cur->left = new TreeNode(a[i]); q.push(cur->left);}
\t\t\tif (++i < n and a[i] != {{inf}}) {cur->right = new TreeNode(a[i]); q.push(cur->right);}
\t\t}
\t}
\treturn root;
}
class SolutionWrapper {
public:
\t{{outputType}} {{funcName}}({{inputsAdjust}}) {
\t\tSolution *sol = new Solution();
\t\t{{outputOriginalType}} answer = sol->{{funcName}}({{inputArgs}});
\t\treturn {{outputName}};
\t}
};
`;


