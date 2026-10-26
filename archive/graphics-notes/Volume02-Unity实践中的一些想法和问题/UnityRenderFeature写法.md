# RenderFeature 基础流程

## 总览

RendererFeature

↓ 创建并加入 RenderFeaturePass

RecordRenderGraph

↓ 登记资源、列表和依赖到PassData

RenderGraph 编译/排序

↓ 稍后执行

ExecutePass(PassData data, RasterGraphContext context

↓ context.cmd 真正绘制

GPU

## PassData 传递数据

RecordRenderGraph：规划人员

↓ 填写工单

PassData

↓ 交给

ExecutePass：执行人员

# 写法

主要参考了Unity的文档（中文）： https://docs.unity3d.com/cn/6000.0/Manual/urp/render-graph-draw-objects-in-a-pass.html

## 基础结构缩略
```csharp
public class DepthPreviewFeature : ScriptableRendererFeature
using System;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.Rendering.RenderGraphModule;
{
    [SerializeField] DepthPreviewFeatureSettings settings;
    DepthPreviewFeaturePass m_ScriptablePass;
    public Material overrideMaterial;
    public override void Create()
    {

    }
    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
    {

    }

    // Use this class to pass around settings from the feature to the pass
    [Serializable]
    public class DepthPreviewFeatureSettings
    {
    }

    class DepthPreviewFeaturePass : ScriptableRenderPass
    {
        public DepthPreviewFeaturePass(DepthPreviewFeatureSettings settings, Material material)
        {
        }


        private class PassData
        {
        }


        static void ExecutePass(PassData data, RasterGraphContext context)
        {
        }
        
        public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData)
        {
            using (var builder = renderGraph.AddRasterRenderPass<PassData>(passName, out var passData))
            {
                // 组装
                UniversalResourceData resourceData = frameData.Get<UniversalResourceData>();
                UniversalRenderingData renderingData = frameData.Get<UniversalRenderingData>();
                UniversalCameraData cameraData = frameData.Get<UniversalCameraData>();
                UniversalLightData lightData = frameData.Get<UniversalLightData>();
                SortingCriteria sortFlags = cameraData.defaultOpaqueSortFlags;
                FilteringSettings filterSettings = new FilteringSettings(RenderQueueRange.opaque);
                
                // 使用上面组装好的Data来创建绘制设置
                DrawingSettings drawSettings = RenderingUtils.CreateDrawingSettings(
                    shadersToOverride,
                    renderingData,
                    cameraData,
                    lightData,
                    sortFlags
                );

                // 替换材质
                drawSettings.overrideMaterial = material;

                // 创建渲染列表参数
                var rendererListParameters = new RendererListParams(
                    renderingData.cullResults,
                    drawSettings,
                    filterSettings
                );

                // 通过Parameters → List → ListHandle → PassData路径，仅将Handle传递给PassData
                passData.rendererListHandle = renderGraph.CreateRendererList(rendererListParameters);

                // This sets the render target of the pass to the active color texture. Change it to your own render target as needed.
                builder.SetRenderAttachment(resourceData.activeColorTexture, 0);

                // Assigns the ExecutePass function to the render pass delegate. This will be called by the render graph when executing the pass.
                builder.SetRenderFunc((PassData data, RasterGraphContext context) => ExecutePass(data, context));
            }
        }
    }
}
```
