const { exec } = require('child_process');
const { access,readdir,stat,mkdir } = require('fs/promises')
const { constants } = require('fs')
const path = require('path')
const commandPath = process.cwd()
function conversion (protoPath,outputPath){
    access(protoPath,constants.F_OK|constants.W_OK).then(()=>{
        readdir(protoPath).then((res)=>{
            Promise.all(res.map(filename=>{
                // 完整路径
                const completePath = path.join(protoPath,filename)
                return stat(completePath).then(res=>{
                    const isFile = res.isFile()
                    return { 
                        path:completePath,
                        isFile,
                        outputPath:isFile?outputPath:path.join(outputPath,filename),
                        filename:path.basename(protoPath)
                    }
                }).catch(err=>{
                    console.log('error:'+completePath)
                    console.error(err)
                })
            })).then(res=>{
                // 判断当前文件夹内是否没有文件夹
                if(res.length!==0){
                    const folders = []
                    const folderInfo = res.reduce((folderInfo,item)=>{
                        if(item.isFile) {
                            folderInfo.hasFile = true
                        } else {
                            folderInfo.hasFolder = true
                            folders.push(item)
                        }
                        return folderInfo
                    },{ hasFile:false, hasFolder: false })
                    if(folderInfo.hasFile){
                        // 需要判断outputPath 是否存在不存在则创建
                        createFolder(outputPath).then(()=>{
                            const command = `npx pbjs -t json-module -w commonjs -o ${outputPath}/${path.basename(protoPath)}.js  ${protoPath}/*.proto`
                            exec(command,(err)=>{
                                if(err){
                                    console.error(`${path.basename(protoPath)}.js文件创建失败`,err)
                                } else {
                                    console.log(`${path.basename(protoPath)}.js文件创建成功`)
                                }
                            })
                        })
                    }
                    if(folderInfo.hasFolder){
                        folders.forEach(item=>{
                            conversion(item.path,item.outputPath)
                        })
                    }
                }
            }).catch(console.error)
        }).catch(console.error)
    }).catch(() => {
        console.log('没有找到proto文件夹,请在当前目录创建proto文件夹')
    })
}

function createFolder(targetPath){
    const pathArr = targetPath.split('/')
    const len = pathArr.length
    let i = 1
    function makePath(path){
        return stat(path).catch(()=>{
            return mkdir(path)
        })
    }
    return makePath(path.resolve(commandPath, pathArr.splice(0,i).join('/'))).then(()=>{
        i++
        if(i<=len){
            makePath(path.resolve(commandPath, pathArr.splice(0,i).join('/')))
        }
    })
}
module.exports = function (protoPath = 'src/proto' ,outputPath = 'src/proto'){
    conversion(protoPath,outputPath)
}
