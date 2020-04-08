## Docs项目 Google Closure学习
> closure代码来自 `merlot/javascript/closure` 拷贝到 goog目录下

### 生成closure依赖
```
python closure/bin/calcdeps.py -p closure -o deps > closure/goog/deps.js
```

### 生成用户脚本依赖
```
python closure/bin/calcdeps.py --dep closure -o deps -p src/js > src/my-deps.js
```
* 需要添加依赖目录配置 `--dep closure`作为项目目录基准
* 用户脚本依赖需要手动加载到html中
