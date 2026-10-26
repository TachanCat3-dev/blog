# 旧站存档 / legacy archive

这里放从旧项目 `E:\Project\GithubShowcase` 里筛出来的、还值得留着的内容。**存档只保存在 Git 里，不参与站点构建**：Astro 只会把 `src/` 和 `public/` 打进 `dist/`，这个目录不会生成页面，也不会影响线上地址。

## 筛选结论

| 旧内容 | 处理 | 理由 |
| --- | --- | --- |
| `Graphics-Study-Notes` 的 6 篇 Markdown 学习笔记 | 保留 → `graphics-notes/` | 有完整知识点和代码片段，是真正的写作素材 |
| `Graphics-Study-Notes/README.md` | 保留 | 记录了开这个笔记库的动机，适合放进关于页或重写时参考 |
| `Volume01-PBR/readme.md`（已被作者删除） | 不恢复 | 内容已并入 `Drafts.md`，重复 |
| `.git`、`.gitattributes`、`.gitignore` | 丢弃 | 子仓库元数据，新仓库里没用 |
| 各个 `.idea/` | 丢弃 | IDE 个人配置 |
| `Unity-Shader-Sandbox` | 丢弃 | 整个仓库只有一个标题式 README，没有任何 Shader 文件 |

原始仓库（仍在 GitHub 上，需要历史版本时直接去看）：

- <https://github.com/TachanCat3-dev/Graphics-Study-Notes>
- `Unity-Shader-Sandbox`（空壳，无远端内容可留）

## 保留清单

| 文件 | 行数 | 内容 |
| --- | --- | --- |
| `graphics-notes/Volume01-PBR/Drafts.md` | 198 | PBR 长文草稿：Albedo 译名之争、金属度为什么能插值、BXDF 家族（BRDF/BSDF/BTDF/BSSRDF）、渲染方程符号、迪士尼 BRDF 全套公式（D/F/G 项）与 Unity 简化 |
| `graphics-notes/Volume02-.../Shader基础.md` | 140 | Unity ShaderLab 经验：贴图声明与 `[MainTexture]`、法线贴图用法、混合法线、光照、URP 阴影实现流程 |
| `graphics-notes/Volume02-.../SRP学习.md` | 96 | RenderPipeline / RenderPipelineAsset 的创建链路、ScriptableRenderContext 与 CommandBuffer 分工、批处理、RenderTarget 切换 |
| `graphics-notes/Volume02-.../UnityRenderFeature写法.md` | 125 | RendererFeature → Pass → RecordRenderGraph 的流程与 PassData 传参、基础结构缩写 |
| `graphics-notes/Volume02-.../Unity中的CPU和GPU数据传递.md` | 98 | CPU/GPU 数据组织差异、Material / Global / ComputeBuffer 三类传参、ShaderLab 与 HLSL 接收方式、使用例 |
| `graphics-notes/Volume02-.../NPR森林的想法与实现计划.md` | 27 | NPR 森林项目所需知识点清单（材质表现、光影、性能、工具链），当选题清单用 |

## 怎么用

这些是**未加工原稿**，没有 frontmatter，路径和文件名都保持原样方便对照历史。要正式发布其中一篇：

```bash
npm run new -- "PBR 与迪士尼 BRDF" pbr-disney-brdf
```

然后把对应草稿搬进新文件、补 `title / date / tags / summary`，边搬边改错。草稿里的语气和结论不必保留，只留知识点。

## 维护约定

- 新东西不往这里放，这里只收旧稿，避免和 `content/posts/` 重复维护。
- 需要更多旧历史时，从上面两个原始仓库取，不要在本仓库里再嵌子仓库（`.git` 一律不带进来）。
