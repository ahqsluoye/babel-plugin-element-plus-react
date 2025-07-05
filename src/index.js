/**
 * @author Parker
 * 实现tree-shaking插件
 * 将 import { ElTransfer, ElInput } from '@qsxy/element-plus-react';
 * 转换成 import { ElTransfer } from '@qsxy/element-plus-react/dist/ElTransfer';
 *       import { ElInput } from '@qsxy/element-plus-react/dist/ElInput';
 */

import fs from 'fs';
import path from 'path';
import Module from 'module';

const projectPath = path.dirname(
    Module._resolveFilename(
        '@qsxy/element-plus-react',
        Object.assign(new Module(), {
            paths: Module._nodeModulePaths(process.cwd())
        })
    )
);

const methods = {
    isEmpty: 'Util',
    isNotEmpty: 'Util',
    randomCode: 'Util',
    getScrollWidth: 'Util',
    generateTree: 'Util',
    download: 'Util',
    htmlInputAttrs: 'hooks',
    htmlInputEvents: 'hooks',
    htmlInputProps: 'hooks',
    partitionHTMLProps: 'hooks',
    partitionAnimationProps: 'hooks',
    partitionPopperPropsUtils: 'hooks',
    partitionTreePropsUtils: 'hooks',
    useClassNames: 'hooks',
    useControlled: 'hooks',
    useClickOutside: 'hooks',
    useComponentWillMount: 'hooks',
    useUpdateEffect: 'hooks',
    useDropdown: 'hooks',
    useChildrenInstance: 'hooks'
};

function readFilePath(srcPath, result) {
    const files = fs.readdirSync(srcPath);
    files.forEach((item) => {
        const stat = fs.statSync(srcPath + item);
        if (stat.isDirectory()) {
            //递归读取文件
            readFilePath(srcPath + item + path.sep, result);
        } else {
            const fileName = path.basename(item, '.js');
            if (item.endsWith('.js') && fileName !== 'index') {
                const parent = path.resolve(srcPath);
                Object.assign(result, {
                    [fileName]: parent.substring(parent.indexOf(`dist${path.sep}`) + 4)
                });
            }
        }
    });
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
            ImportDeclaration(path) {
                let { node } = path,
                    { specifiers, source } = node,
                    value = source.value;

                if (value === '@qsxy/element-plus-react') {
                    specifiers.forEach((spec) => {
                        if (t.isImportSpecifier(spec)) {
                            const name = spec.imported.name;
                            spec.type = 'ImportSpecifier';

                            if (methods[name]) {
                                path.insertBefore(t.importDeclaration([t.clone(spec)], t.stringLiteral(`${value}/dist/${methods[name]}`)));
                            } else if (name.startsWith('ElIcon')) {
                                path.insertBefore(t.importDeclaration([t.clone(spec)], t.stringLiteral(`${value}/dist/ElIcon`)));
                            } else {
                                path.insertBefore(t.importDeclaration([t.clone(spec)], t.stringLiteral(`${value}/dist/${name}/${name}`)));
                            }
                        }
                    });

                    removes.push(path);
                }
            }
        }
    };
}
