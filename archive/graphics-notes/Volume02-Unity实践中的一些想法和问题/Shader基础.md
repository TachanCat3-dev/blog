# UnityShaderlab中的一些经验
这篇随手收录了一些个人写Shader时的疑惑点和常用的数学知识 省略了很多简单内容 无序

# 纹理TEXTURE使用方法和API示例

## Shader中贴图的基础声明和使用流程
Unity默认的Shader模板的Properties中有BaseMap贴图声明

形式如下:

    [MainTexture]_BaseMap ("Base Map", 2D) = "white" {}

`[MainTexture]`：Property Attribute (属性标签 / 特性)。 可选参数，用于控制材质面板的 UI 行为或指定特殊逻辑。

`_BaseMap`：Property Name (属性名 / 内部变量名)。

`"Base Map"`：Display Name (显示名)。 可以自己定义在Unity材质面板中显示的名称。

`2D`：Property Type (属性类型)。 标准的二维纹理。常用的还有`Cube`(由六张图像组成 常用于天空盒与环境反射探针) `3D`(用于体积雾流体数据计算等)。

`white`：Default Value (默认值)。 在Unity侧无指定纹理时生效。

接下来会在HLSLPROGRAM中使用

    TEXTURE2D(_BaseMap);
    SAMPLER(sampler_BaseMap);

我们需要在CBUFFER中声明偏移项 因为Unity使用宏处理缩放偏移项，所以用的是名称对齐，用原有的贴图名+_ST。

    CBUFFER_START(UnityPerMaterial)

    float4 _BaseMap_ST;
    float4 _DetailTex_ST;

    CBUFFER_END

同时在VertexShader中对其进行变换。

    OUT.uv.xy = TRANSFORM_TEX(IN.uv.xy, _BaseMap);
## 法线贴图的使用方法
声明

    [NoScaleOffset] _NormalMap("Normal Map", 2D) = "bump" {}

正常进行贴图的准备

    TEXTURE2D(_NormalMap);

    SAMPLER(sampler_NormalMap);

采样时略有不同 这里我们要专门为法线贴图使用Unity给我们准给好的法线解包工具:

    float3 normalTS = UnpackNormalScale(normalMap, _normalScale);

这里的UnpackNormal干了什么?

简而言之 Unity在导入NormalMap的时候会使用 ***DXT5nm*** 协议进行压缩，Unpack顾名思义就是把它解压缩回RGB空间。

注意到这个normalTS的后缀为 TS切线空间(Tangent Space)，我们需要用TBN矩阵将其转换到 WS世界空间(WorldSpace)。

## 混合法线
我们无法像之前那样用两个颜色相乘的方式混合法线。

理想情况下，当其中一个为平面时，它完全不应该影响另一个。

常用的方式是Whiteout 代码如下：
```shaderlab
// 正确的混合方式
float3 mainNormal = UnpackNormalScale(SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, i.uv.xy), _BumpScale);
float3 detailNormal = UnpackNormalScale(SAMPLE_TEXTURE2D(_DetailNormalMap, sampler_DetailNormalMap, i.uv.zw), _DetailBumpScale);

// 使用 Unity 内置函数进行混合
i.normal = BlendNormal(mainNormal, detailNormal);
```
# 光照


# 阴影
在 URP（通用渲染管线）中，带有 "LightMode" = "ShadowCaster" 的 Pass 的唯一职责是：把物体的深度信息写入当前光源的阴影贴图（Shadow Map）中。

URP 的底层 C++ 渲染管线会自动遍历光源。对于每一个需要生成阴影贴图的光源，管线会自动调用场景中相关物体的 ShadowCaster Pass。

如果没有自己写的需求可以简单的挂上unity写好的`ShadowCasterPass.hlsl`
```shaderlab
// 这里是投射阴影的pass
Pass
        {
            Name "ShadowCaster"
            Tags
            {
                "LightMode" = "ShadowCaster"
            }
            ZWrite On
            ZTest LEqual
            ColorMask 0

            HLSLPROGRAM
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment


            #include "Packages/com.unity.render-pipelines.universal/Shaders/ShadowCasterPass.hlsl"
            ENDHLSL

        }
```    
同时要在HLSLPROGRAM中声明接收阴影
```shaderlab
    #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
    #pragma multi_compile _ _SHADOWS_SOFT
```
在顶点着色器中：计算顶点对应的阴影纹理坐标。
```shaderlab
    // 声明在 Varyings 结构体中
    float4 shadowCoord : TEXCOORD1; 

    // 在 Vertex 函数中计算
    VertexPositionInputs vertexInput = GetVertexPositionInputs(input.positionOS.xyz);
    output.shadowCoord = GetShadowCoord(vertexInput);
```
在片元着色器中：获取光源信息时传入阴影坐标，并将其应用到颜色上。
```shaderlab
    // 传入 shadowCoord 获取带有阴影衰减（shadowAttenuation）的主光信息
    Light mainLight = GetMainLight(input.shadowCoord);
      
    // mainLight.shadowAttenuation 的值在 0（完全在阴影中）到 1（完全被照亮）之间
    half3 diffuse = mainLight.color * (NoL * mainLight.shadowAttenuation);
```




## URP阴影实现流程
简单来说，我们需要一个专门的ShadowCasterPass用于获得阴影的深度图，也就是投射阴影。随后在最初的Pass中接收这个阴影。






