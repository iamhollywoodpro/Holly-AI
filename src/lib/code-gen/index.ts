export { scaffoldProject, getTemplateFilesList, getTemplateFileContent, TEMPLATE_DESCRIPTIONS } from './project-scaffolder';
export type { ScaffoldOptions, ScaffoldResult, ProjectTemplate } from './project-scaffolder';

export { generateCode, generateMultipleFiles, patchCode, debugCode } from './code-generator';
export type { CodeGenRequest, CodeGenFile, CodeGenResult } from './code-generator';

export { searchCode, searchFiles, getFileTree } from './code-search';
export type { SearchResult, SearchOptions, FileSearchResult } from './code-search';

export { patchFile, insertContent } from './code-patcher';
export type { PatchRequest, PatchResult, InsertRequest } from './code-patcher';
