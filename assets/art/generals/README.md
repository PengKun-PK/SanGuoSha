# 武将拓展插图

一将成名 2011–2015 的 55 位武将，以及神话再临的 8 位神将，各自使用独立插图。
由内置 image_gen 逐张生成，完整提示词见 prompts.json，文件名与武将 ID 一致。

普通武将采用古风写实造型；神将采用神话场景与专属光效：
关羽／翡翠龙雷，吕蒙／苍海天眼，周瑜／烈焰凤凰，诸葛亮／七星天穹，
曹操／紫夜魂军，吕布／赤霄战怒，赵云／银龙雷霆，司马懿／蚀日星轮。

游戏加载同目录的 WebP 文件，保留原图尺寸，以 0.86 质量编码，构图不变。
生成 PNG 原稿保存在本地 tests/artifacts/portrait-originals（不纳入 Git）。
编码工具：node scripts/prepare-portraits.cjs。
素材映射：assets/manifest.js；选将与对战头像共用同一素材。

验证：先运行 npm start，再运行 npm run test:portraits。
检查 63 张图片的唯一性、解码、武将映射、五个年份的选将页，以及神将选择势力后的对战头像；
界面截图输出到 tests/artifacts/portraits-*.png。
