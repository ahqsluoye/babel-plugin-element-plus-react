/**
 * @author Parker
 * 实现tree-shaking插件
 * 将 import { ElTransfer, ElInput } from '@qsxy/element-plus-react';
 * 转换成 import { Transfer as ElTransfer } from '@qsxy/element-plus-react/dist/Transfer';
 *       import { Input as ElInput } from '@qsxy/element-plus-react/dist/Input';
 */

import fs from 'fs';
import path from 'path';
import Module from 'module';

const projectPath = path.resolve(path.resolve(Module._nodeModulePaths(process.cwd())[0], '@qsxy'), 'element-plus-react');

const methods = {};

function readFilePath(srcPath, result) {
    const indexPath = srcPath + 'dist' + path.sep + 'index.d.ts';
    const index = fs.statSync(indexPath);
    if (index.isFile) {
        fs.readFile(indexPath, function (err, data) {
            if (err) {
                console.log(err);
            } else {
                let match;
                const content = data.toString();
                const regex = new RegExp(/export((\stype)*\s*\{*\s*)([a-zA-Z,\s]*)(\s*\}*)(\s*from\s*)["|'](.*?)["|']/, 'g');
                while ((match = regex.exec(content)) !== null) {
                    const comps = match[3];
                    const from = match[6];
                    // console.log(comps, from);
                    if (comps && from) {
                        comps.split(',').forEach((item) => {
                            const component = item.trim();
                            let local = component;
                            let _import = component;
                            if (local.includes(' as ')) {
                                _import = _import.split(' as ')[0].trim();
                                local = local.split(' as ')[1].trim();
                            }
                            if (local) {
                                Object.assign(result, {
                                    [local]: {
                                        _import,
                                        local,
                                        fullImp: component,
                                        dest: from.replace('./', '')
                                    }
                                });
                            }
                        });
                    }
                }
                // console.log(result);
            }
        });
    }
}

readFilePath(projectPath + path.sep, methods);

export default function ({ types: t }) {
    let removes;

    return {
        visitor: {
            Program: {
                enter() {
                    removes = [];
                },
                exit() {
                    removes.forEach((path) => path.remove());
                }
            },
            /**
             * specifiers表示import导入的变量组成的节点数组，source表示导出模块的来源节点。这里再说一下specifier中的imported和local字段，imported表示从导出模块导出的变量，local表示导入后当前模块的变量
             * @param {*} path
             */
            ImportDeclaration(path) {
                let { node } = path,
                    { specifiers, source } = node,
                    value = source.value;

                if (value === '@qsxy/element-plus-react') {
                    specifiers.forEach((spec) => {
                        if (t.isImportSpecifier(spec)) {
                            const name = spec.imported.name;

                            if (methods[name]) {
                                if (methods[name].fullImp.includes(' as ')) {
                                    spec.imported.name = methods[name]._import;
                                }
                                path.insertBefore(t.importDeclaration([t.clone(spec)], t.stringLiteral(`${value}/dist/${methods[name].dest}`)));
                                // path.insertBefore(t.importDeclaration([t.ImportDefaultSpecifier(spec.local)], t.stringLiteral(value + '/dist/' + methods[name].dest)));
                            }
                        }
                    });

                    removes.push(path);
                }
            }
        }
    };
}
