# Unity中的CPU与GPU数据传递API使用方法
在学习CatlikeCoding的过程中已经快被各种Buffer,PropertyBlock等名称击晕 于是决定写一篇短文章用于梳理Unity中数据流向方面的知识

因为本人仍在学习探索过程中 暂不能给出绝对正确且通俗易懂的解释还请见谅

# 核心数据流:

CPU 准备数据 -> 提交到 Command Buffer -> GPU 读取渲染

# CPU和GPU内的数据都是什么样的?

## CPU偏爱的数据组织方式:复杂、灵活、散装 (Object-Oriented)

CPU 拥有庞大的缓存（Cache）和极其复杂的控制逻辑单元。它天生就是为了处理“杂乱无章”和“逻辑复杂”的任务而生的。

### CPU数据形态偏好：

喜欢“散装”和“嵌套”的数据：CPU 非常擅长处理带有大量指针（Pointers）、引用、链表（Linked Lists）、树结构（Trees）的数据。

喜欢面向对象（OOP）：在 C# 中，我们习惯写各种 Class，互相继承，互相引用。这些数据在物理内存上往往是东一块西一块散落的，但 CPU 依靠强大的缓存和逻辑，能轻松地顺着指针把它们找出来。

## GPU偏爱的数据组织方式:简单、紧凑、对齐 (Data-Oriented)

### GPU数据形态偏好：

极度渴望“连续排列”的简单数据：GPU 非常讨厌指针。它最喜欢的数据结构就是数组（Arrays），而且最好是内存里连续紧挨着的一整串数据. 所以一般都是一整个一维数组按字节数隔断来获取其中的单个数据 例如一整串几百个float

喜欢基础数据类型的组合：比如连续的 float，或者打包好的向量（float4）和矩阵（float4x4）。

喜欢“对齐（Alignment）”：为了读取效率，GPU 喜欢规规矩矩的打包格式（比如 HLSL 中常提到的以 16 byte / 4个float 为边界对齐）。

>GPU 的噩梦（避坑点）：
>
>分支发散（Divergence）：如果让这十万个小学生同时计算，但中间加了个 if(条件) {做A} else {做B}。因为小学生们步伐必须一致，导致做A的人运算时，做B的人只能干瞪眼等他们做完，性能直接减半！

在 Unity 里的体现：

各种 Buffer（如 ComputeBuffer, GraphicsBuffer）、连续的顶点数组（Mesh 的 Vertex Buffer）、贴图的像素数组（Texture）。

# C#(CPU)端用于传递给GPU的几大数据类型

## 基础单体传参（Material API）

`Material.SetFloat(), SetInt(), SetColor(), SetVector(), SetTexture(), SetMatrix()`

> 避坑： Renderer.material（会实例化新材质，破坏合批，可能引起内存泄漏）与 Renderer.sharedMaterial（修改全局共用材质）的区别。


## 全局数据传递（Global API）

`Shader.SetGlobalFloat(), SetGlobalTexture()` 等。

应用场景：全局天气系统、时间变量（如风吹草动的时间驱动）、全局环境光纹理。

高性能/多实例传参（MaterialPropertyBlock）

讲清楚为什么需要它：在使用 GPU Instancing 时，如何给成百上千个同材质但不同颜色/属性的物体传参，且不产生材质实例化（不额外增加Draw Call）。

使用方法：`Renderer.SetPropertyBlock()`。

## 大规模结构化数据传递（ComputeBuffer）

应用场景：Compute Shader计算、大规模粒子系统、传递自定义结构体数组。

核心API：`ComputeBuffer.SetData()` 和 `Material.SetBuffer()`

# Shader(GPU)端的数据接收类型

## ShaderLab 的 Properties 块

说明这只是为了让 Unity Inspector 面板能显示和调节，它不是真正在 GPU 代码里接收数据的变量。

## HLSL 常规变量接收

C# 端的数据类型与 HLSL 类型的映射关系对照表（例如：Vector -> float4, Color -> float4, Texture -> Texture2D / sampler2D, Matrix -> float4x4）。

强调变量名必须与 C# 端 Set API 中的字符串（或 `Shader.PropertyToID`）完全一致。

常量缓冲区（Constant Buffer）与 SRP Batcher（现代渲染管线必修）

说明在 URP/HDRP 中，为了支持 SRP Batcher 提升性能，材质属性必须包裹在 CBUFFER_START(UnityPerMaterial) 和 CBUFFER_END 中。这也是区别于传统老旧教程的重要知识点。

StructuredBuffer 接收大规模数据

对应 CPU 端的 `ComputeBuffer`，HLSL 中如何使用 `StructuredBuffer<T>` 和 `RWStructuredBuffer<T>` 来读取和写入。


# 日常书写建议

改单个物体且不需要合批 ->`Material.SetX`

改全局环境 -> `Shader.SetGlobalX`

大量同材质物体各自状态不同 -> `MaterialPropertyBlock`

传递海量计算数据 -> `ComputeBuffer`

# 使用例