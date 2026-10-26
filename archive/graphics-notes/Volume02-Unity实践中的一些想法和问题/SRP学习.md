# Unity的SRP相关内容学习
SRP(SriptableRenderPipeline)可以说是目前Unity最大的特色了，可以通过SRP非常方便的更改渲染管线，
常用的URP和HDRP也都是Unity官方在SRP的基础上写出来的，所以理解SRP非常重要。

SRP 的架构设计非常精妙，理解了“数据注入 -> 指令打包 -> 统一提交”的流向，写管线时就会清晰很多，理解了SRP之后写URP项目也会如鱼得水。

# RenderPipeline和RenderPipelineAsset
Unity 引擎读取你配置好的 RenderPipelineAsset。

引擎在后台调用 Asset 里的重写方法 CreatePipeline()。

Asset 在这个方法里，把自己的配置数据作为参数，new 出来一个 RenderPipeline 实例并交还给引擎。

引擎随后每帧调用这个 RenderPipeline 实例的 Render() 方法。

>为什么要分成两个类？ 因为 Unity 需要区分“数据”和“逻辑”。


# 渲染指令
## ScriptableRenderContext (context) 桥梁与大管家
`context` 是 C# 脚本与 Unity 底层 C++ 图形引擎通信的**唯一**桥梁。

它主要负责宏观层面的调度：执行 CommandBuffer、画天空盒 (context.DrawSkybox)、画剔除后的网格 (context.DrawRenderers)。

在一切都组装完成后调用Submit()方法传递给C++引擎和GPU去执行。
```csharp
context.Submit();
```

## CommandBuffer 底层图形指令的打包器
`CommandBuffer` 里装的是原生的、直接给 GPU 下达的渲染状态指令。

它的核心意义在于“打包预组装”。我们为了减少 C# 和 C++ 之间的通信开销，会把几十条指令写进 CommandBuffer，然后一次性塞给 context。

例如设置渲染目标（Render Target）、清除屏幕（Clear）、设置全局材质参数（SetGlobalColor）、调用计算着色器（DispatchCompute）。

为了在FrameDebugger中清晰地看见我们的Buffer，我们需要给Buffer一个名字：
```csharp
const string bufferName = "Render Camera"; // const string防GC，同时防止多处手动输入"Render Camera"手滑导致的错误。

CommandBuffer buffer = new CommandBuffer 
{
    name = bufferName
};
```

常用的执行方法是将执行和清空绑定在一起：
```csharp
void ExecuteBuffer () 
{
    context.ExecuteCommandBuffer(buffer); // 执行CommandBuffer也得传递给context，光靠Buffer无法运行。
    buffer.Clear();
}
```

# 批处理
SRPBatcher和GPUInstancing

# RenderTarget
有时候需要将阴影等渲染结果输出到其他的渲染目标上，此时需要更改我们的RenderTarget。

RenderTarget（渲染目标）就是 GPU 当前这一趟绘制要写入的内存区域。
默认情况下我们渲染到摄像机的帧缓冲（最终显示在屏幕上），但很多效果需要先把结果画到一张离屏纹理里，
之后再采样使用——阴影贴图、后处理、反射等都是这个套路。

## RenderTarget 常用类别

- **CameraTarget（摄像机目标 / 屏幕）**：通过 `BuiltinRenderTextureType.CameraTarget` 引用，最终呈现给玩家的画面。
- **RenderTexture**：一张可以被着色器采样的离屏纹理，是最常用的中间目标。可以是颜色纹理，也可以是深度纹理（阴影贴图就是把深度写进这里）。
- **RenderTexture 数组 / 图集（Atlas）**：把多盏灯的阴影贴图塞进同一张大图的不同区域，减少切换开销，是 SRP 阴影系统的典型做法。

## 如何切换 RenderTarget

在 SRP 里通过 CommandBuffer 设置：

```csharp
// 申请一张临时 RT（阴影图集），R 通道存深度
buffer.GetTemporaryRT(
    shadowAtlasId, atlasSize, atlasSize,
    32, FilterMode.Bilinear, RenderTextureFormat.Shadowmap);

// 把后续绘制重定向到这张 RT
buffer.SetRenderTarget(
    shadowAtlasId,
    RenderBufferLoadAction.DontCare,   // 不需要保留上一帧内容（性能优化）
    RenderBufferStoreAction.Store);    // 渲染完要保留，后面采样

buffer.ClearRenderTarget(true, false, Color.clear);
```

要点：
- `RenderBufferLoadAction.DontCare` 表示不关心 RT 里的旧数据，省一次读取带宽。
- `RenderBufferStoreAction.Store` 表示绘制结果要写回内存，供后续 Pass 采样。
- 用完临时 RT 后记得 `buffer.ReleaseTemporaryRT(shadowAtlasId)` 释放。


