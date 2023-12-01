---
title: Android逆向工程实战——绕过MinecraftPE正版验证
title_url: android-reverse-engineering-bypass-minecraft-pe-authentication
type: blog
date: 2023-08-22
updated: 2023-08-24
tags: 
  - 逆向
  - Java
  - MinecraftPE
  - Android
  - smali
categories:

big_cover: https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/minecraftPE_banner.jpg
small_cover: https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/minecraftPE200.jpg
mark: 100
---
# Android逆向工程实战——绕过MinecraftPE正版验证
> Neboer并不是专业的Android开发者，更不是专业的ctfer/hacker，不过如果能合理利用工具，聚集众人的智慧，说不定可以解决一些看起来比较棘手的问题。我们今天就来看看，我们是如何绕过Google Play版MinecraftPE的正版验证的。这个方法可能有一定的通用性，应该可以用来绕过一些依赖Google Play进行正版验证的、未混淆的应用。

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/minecraftPE_banner.jpg)

**本文所介绍的方法均为学习用途，有条件请大家支持正版。**

灵动MC的特色之一，就是同时支持基岩版和Java版客户端登录。由于我们的游戏版本经常随上游更新，基岩版版本要求也随着Geyser的更新而不断升级，而我们一直苦于没有一个稳定的方法能提供给国内玩家可以直接拿来玩的、最新的MinecraftPE安装包——Google Play上的Minecraft虽然并不昂贵，但是国内用户肯定是连不上Google Play的，更别提在Play商店上付费购买软件了，所以抱歉在这里实在是没条件支持正版。那随便从网上找个破解版——总不能每次版本更新之后都到网上找各种破解版吧！而且破解版更新慢，还可能有各种兼容性问题，最重要的是不安全的、恶意的破解可能会对玩家设备安全性造成威胁。因此，我们做出决定，我们要制作属于自己的MinecraftPE离线安装包，要尽量让所有玩家的手机都能安装，要始终和Play商店中发布的最新版本保持一致！

说干就干，感谢伟大的Groundhog，斥资在香港Play商店购买了MinecraftPE，让我们的所有工作得以开始。

## 破解MinecraftPE的原理

为什么MinecraftPE是一个可以破解的软件？

Minecraft PE是依靠微软账号对用户进行认证的，但用户购买Minecraft却是在Google Play上操作的，所以Minecraft就算绑定了Google账号，这个账号与用户的游戏内身份也一点都没关系，这个所谓的Google用户只是单纯的被用作“正版校验”的工具而已。而微软账号是不存在“购买游戏”这个说法的，任何微软账号都可以登录MinecraftPE，然后就可以顺利的连接各种服务器，加入他们的游戏了，其中当然就包括我们灵动MC服务器，用这种方法连接完全没有问题。

所以说，所谓破解MinecraftPE的原理，就是想办法绕过MinecraftPE对用户是否确实购买了这个游戏所进行的校验，算是一个一次性的DRM。这个校验应该只在软件开启阶段进行，只要通过了校验，用户就可以进入游戏，自由的在移动设备上畅玩MC了，不过每次重新打开的时候还是要校验一次。

所以，破解MinecraftPE，本身也是希望让这个软件在国内变得可用。不然就算真的有条件，历尽艰辛购买了MinecraftPE，结果却因为不能访问Google服务就无法通过验证而无法进入游戏，也是完全不能接受的。

## 获取软件

最基础的一步就是从Google Play商店里下载MinecraftPE了。由于我们已经购买，所以可以直接下载安装。软件体积很大，经过一段时间才安装完成。

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/minecraftPEGooglePlay.webp)

安装成功之后，启动游戏，但完全无法进入游戏——“正版受害者”，每次打开游戏都必须保证自己能正常访问Google服务，让Google Play与服务器校验，验证成功之后才能启动。如果无法访问Google服务，则MinecraftPE会直接报错，不能进入游戏。这实在是非常不方便，也说明了破解的必要性。

一开始，我觉得，MinecraftPE也是一个普通的Android应用，我们直接把它的base.apk从data文件夹里拽出来不就行了？甚至都不用root！如果抱着这种想法，那只能说实在是不懂现在的Android开发了——从Android 5.0版本开始Google引入了Split APK的功能，apk可以不再是单独的单个apk安装包，一个大软件往往可以由很多的小apk组成。又根据[Google文档](https://developer.android.com/build/configure-apk-splits)，Google于2021年8月就开始强制要求新的软件必须都以APP Bundle格式进行发布，让Google Play自动生成为不同用户设备所优化的版本。对于Minecraft这种大型游戏而言，Google显然不会要求你下载所有的游戏资源，而只会要求你下载一部分公用游戏数据、apk本体和你对应地区的本地化文件即可，这样大大缩短了用户的下载时间，还减少了对设备内存的占用，而且可以更好的保护正版游戏资源。

所以当你去`/data/app/~~xxx==/com.mojang.minecraftpexxx==`文件夹下之后，你会发现如下的文件结构：

```fs
.
├── base.apk
├── base.digests
├── base.dm
├── lib
│    └── arm64
├── split_config.arm64_v8a.apk
├── split_config.xxhdpi.apk
├── split_config.zh.apk
└── split_install_pack.apk
```

显然，MinecraftPE被拆分成了许多许多份小apk文件，Google Play只给我们安装了其中的几个——但有这些也够了。我们可以使用[Split APKs Installer](https://github.com/Aefyr/SAI)等工具安装多个软件包，也可以直接使用adb命令安装，也可以用apks格式打包这些apk后统一安装……但这些方法都依赖一定的技术力和第三方软件，而且不是所有的手机都支持安装apks文件的。这种发布软件的方法非常不方便，有没有什么方法可以将这些apk打包成一个单独的apk文件，就像传统软件一样呢？

## 合并APK文件

合并多个APK文件到一个单独的apk的原理可能并不复杂，其实就是将所有的apk作为module输入到一个巨大bundle之中。不过虽然清楚原理，但我们没有很快找到有如何将多个apk合并成一个apk的软件。我们不常进行Android逆向，在这个领域的经验非常少，所以还是进行了一番调查，颇费一番功夫。

### 完全不好用的SAP

首先我们根据[这篇介绍](https://www.andnixsh.com/2020/06/sap-split-apks-packer-by-kirlif-windows.html)找到了软件SAP，然后下载了最新版**Split APKs Packer v6.9.0 (Windows).zip**，这是一个使用tkinter编写的Python软件，姑且算是一个开源项目？不过我并没在软件介绍和Google的搜索结果中看到这个软件的源代码，所以我推测它可能是一个闭源软件——一个闭源的、使用Python tkinter编写的软件（叠buff是吧）。算了，如果这个软件能用就不计较了——但它不能用！软件输出会提示，`split_install_pack.apk is not a configuration module! Exluded from the project.`，而这个637M的巨大APK却是游戏主要的资源文件所在，怎么能被轻易的排除在外？感觉这个软件完全不好用。

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/SAP_screenshot.webp)

### SplitPacker打包的软件会闪退

我们找到了[SplitPacker](https://github.com/TheArmKing/SplitPacker)这个项目。看他的README里的介绍觉得这个软件是可以相信的——但为什么只有UNIX环境的脚本啊？！这让我Windows用户情何以堪。费了好大的劲将它适配到了MSYS2环境里，我们还用了AAPT的版本，将Windows里的Android SDK里的aapt.exe移到了软件目录，好不容易可以运行并且最终输出了一个apktool数据文件夹（apktool打包并签名竟然还不是自动完成的），这下输出的apk文件大小是对了，但是装在手机里会闪退！我估计肯定是什么Manifest之类的修改炸了，实在是太伤了。

### ApkEditor出来救场

返璞归真，我们找到了xda论坛上的[一篇帖子](https://forum.xda-developers.com/t/how-to-merge-splited-apk-files.4529011/)，里面提到了[apkeditor](https://github.com/REAndroid/APKEditor)这个工具。

这个apkeditor也是一个Android逆向工具箱，和[apktool](https://github.com/iBotPeaches/Apktool)是一样的，不同的是，它在软件的使用方法里说明自己支持一个merge选项，可以将多个split apk包合并成一个apk文件，这正是我们想要的功能，所以我决定试一下。

```
java -jar C:\programs\APKEditor-1.3.0.jar m -i .\com.mojang.minecraftpe -o com.mojang.minecraftpe_modified.apk
```

命令执行完毕，执行的效果非常非常好，我们成功的将文件夹内的多个apk文件集中成单个APK文件，可以很方便的分发和安装了！不过接下来要做的破解工作，才是我们的重中之重。

## 绕过Google授权验证的工具

现在来到了最困难的部分。我们决定用一些技术手段绕开Google验证。我们首先想到的，自然而然就是一些破解软件和脚本。

### 根本幸运不了一点的幸运破解器

LuckyPatcher，幸运破解器，是Android平台中一个非常受欢迎的、用来与Google Play等软件巨头主场作战的破解器。它的功能很多，小到去软件的广告，大到内购破解，他都完全可以胜任。是不是可以用幸运破解器来直接修改APK文件来方便的破解呢？我们实际测试下来根本不行。

幸运破解器对付这种Google验证的主要方法——移除授权验证，拥有多种复杂的攻击模式，自动模式、逆向破解、极限破解、针对亚马逊市场的破解等等。不过针对应用授权验证的破解，使用场景不是很多，大多数时候幸运破解器都是用来去谷歌广告的，还是比较好用。

经过我反复尝试，幸运破解器的各种使用方法我都用了一遍，我的评价是根本破解不了一点，这个恼人的授权验证还是拦在安装完成之后的玩家眼前，非常让人沮丧。

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/license_error.webp)

自定义破解是幸运破解器中又一个非常重要的功能，有一些软件可能已经有开发者提前破解好了，提交了对应的patch到破解器中，这样一来只需要安装对应的patch就可以直接破解游戏了！MinecraftPE在幸运破解器上有没有优秀的自定义破解？有，但是非常蠢的一点是——

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/luckypatcher_custom_patches.webp)

这些所谓的“自定义破解”根本不是用来破解软件授权验证的，全都是逆天外挂！幸运破解器这条路看来是不行了。我看到这里我直接一口老血喷在屏幕上，这什么东西草……（不要在服务器里尝试外挂，服务器有反作弊插件，根本开不了一点）

### 试图踩在前人的肩膀上……

但是滑落了。

我们在GitHub上找到了一个项目[mcrack](https://github.com/mcrax/mcrack)，它说可以破解MinecraftPE安卓版MC。我们严格按照它的README.md中的指示，将PmsHookApplication.Smali放在了com/mojang/minecraftpe目录中，然后修改AndroidManifest.xml，但结果还是失败了。编译之后可以正常打开，但还是不能绕过Google Play验证，和没有打patch的效果是一样的。

我们又在各种网站和论坛上搜索，甚至在[apktoy](https://www.apktoy.com/download/com.mojang.minecraftpe_1.20.15.01_free.html)上专门下载安装了一个破解的最新版本，确实可以离线使用，但当我反编译的时候却发现它根本不是patch原版APK得来的，而是用了一个什么loader，整个dex反编译之后只有一个文件，我甚至找不到原版MC的dex代码被它放到哪里去了。

我们还想继续找破解版软件，然后将其反编译后检查它和原版本的区别，不过总觉得很难找到真正的基于源码的破解。看来想取巧是不可能的了，是不是只能攻坚了？

## 破解MinecraftPE

说来也是非常巧合，昨天晚上我和Eibon在研究破解Minecraft问题的时候，碰巧Miyanio也在线。最后是我们三个一起解决的Minecraft正版验证的问题。

### Android逆向前置知识

Android逆向是一个以不变应万变的技术。Android软件中起到核心作用的就是dex字节码，其中包含了能被Android虚拟机运行的代码文件。dex就好像jar文件一样，是二进制化、扁平化的“机器码”集合。Android的APK包中除了dex外还有很多其他的资源文件，像xml和resources文件等，这些文件是经过混淆过的文本文件。一般情况下，我们可以用apktool这种软件轻易的将apk中的所有内容反编译、反混淆出来，得到一些未混淆的资源文件及Smali程序代码，供我们下一步操作。Smali程序代码就是dex文件经过简单转译之后的结果，Smali代码与dex文件的关系，类似汇编语言与可执行程序之间的关系一样。

Smali代码的可读性非常差，因为它没有程序结构可言，它是顺序执行的，里面充斥着跳转和难懂的变量用法，我们需要将smali代码转换成java代码后再进行阅读。可是目前反编译Smali代码的反编译器肯定不如反编译Java字节码的反编译器成熟——很有意思，所以一般情况下反编译Android dex文件的思路是——先把dex“转换”成jar文件，将*Dalvik Virtual Machine*或*Android Virtual Machine*可执行的字节码无损转换成Java的class字节码，然后再使用Java反编译器对Jar文件进行反编译，最终得到人类可读的Java文件。这种方法所得到的代码质量非常高，几乎可以完整还原源码。

整个Android破解分成两个流程：分析阶段和破解阶段。拿到源代码是属于分析阶段，通过分析软件源代码，可以定位到软件关键操作所在的位置。然后这个时候就需要去改动Smali代码了——由于Java代码是由Smali反编译而来，不一定100%准确，也很难直接编译回去（通常存在各种错误），所以最稳妥的方法就是最小修改原则，根据你希望在Java代码中进行的修改来patch Smali代码文件，这也是整个破解过程中最有挑战性的一环，如果成功patch，就可以将整个软件重新打包，安装测试了。

当然，实际上反编译的效果还是取决于软件有多容易反编译。在这场“信息战”中，反编译者永远是站在信息缺失的一方。软件开发者只需要对源码进行加壳或混淆操作，就可以获得源代码的难度成倍上升，极大的增加了软件的安全性和破解软件的难度。

### 获得MinecraftPE的源代码

那么，反编译在MinecraftPE上是否有效果呢？我们就按之前的思路，采用[APKEditor](https://github.com/REAndroid/APKEditor)将我们合并后的apk包进行解包反编译。

```shell
java -jar C:\programs\APKEditor-1.3.0.jar d -i com.mojang.minecraftpe_modifiedv1.apk -o decompiled_v1_minecraft
```

这样，MinecraftPE的源代码就可以在decompiled_v1_minecraft\smali里找到了。smali文件夹下有两个classes，分别对应来自两个MinecraftPE apk包中的dex代码。

这个smali代码，在分析阶段基本没什么用，我们主要是想看到MinecraftPE的源代码。将dex转换成jar，我们有[dextools](https://github.com/pxb1988/dex2jar)，一个已经两年没有更新的软件（但是好用啊），我们直接执行

```shell
C:\programs\dex-tools-2.2-SNAPSHOT\d2j-dex2jar.bat -f C:\projects\download_mc_apk\com.mojang.minecraftpe_modifiedv1.apk
```

得到文件`com.mojang.minecraftpe_modifiedv1-dex2jar.jar`之后，就可以开始对这个jar进行反编译了。

这里登场的是[fernflower](https://github.com/fesh0r/fernflower)，Jetbrains IDE内置的Java反编译器，生成的代码质量非常高，效果相当炸裂。但是由于我们希望使用IDE内置的反编译器，所以需要调用特殊的命令。根据StackOverFlow上的[这篇回答](https://stackoverflow.com/questions/39864346/fernflower-and-intellij-ideas-java-decompiler)，我们构造出了一个能用的指令。decompiled_dex是最终输出dex的目标文件夹。

```shell
java -cp "C:\Users\xxx\AppData\Local\Programs\IntelliJ IDEA Ultimate\plugins\java-decompiler\lib\java-decompiler.jar" org.jetbrains.java.decompiler.main.decompiler.ConsoleDecompiler "C:\projects\download_mc_apk\com.mojang.minecraftpe_modifiedv1-dex2jar.jar" decompiled_dex
```

打开decompiled_dex，我们看到了一个叫做`com.mojang.minecraftpe_modifiedv1-dex2jar.jar`的文件，这显然就是一个由Java源代码组成的一个jar包，我们直接解压它的内容到当前文件夹，得到了MinecraftPE的Java源代码。Minecraft的源码量并不多，只有35.5 M。

至此，我们得到了Java源码，可以正式开始分析工作了。

### 定位认证函数

获得了源代码，如何开始正式的分析？别急，让我们先读一读这份源代码。

经过我们的研究，MinecraftPE的源代码几乎完全没有经过任何的混淆，所有的类型名、方法名都非常清晰，软件中没有额外的混淆来扰乱对源代码的理解，阅读起来非常轻松。

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/AndroidStudioDecompileSourceCapture.webp)

这真是一个非常令人振奋的好消息。

既然源代码没有混淆，那破解起来就非常简单了。如何定位认证函数的位置？我们的主要策略就是 Logcat分析+关键字符串搜索。

我们使用字符串搜索，找到了com.mojang.minecraftpe.store.googleplay.GooglePlayStore类，找到了这个`allow`方法：

```java
public void allow(int var1) {
   String var2;
   if (var1 == 291) {
      var2 = new String("RETRY");
   } else if (var1 == 256) {
      var2 = new String("LICENSED");
   } else {
      var2 = new String("UNKNOWN REASON");
   }

   this.this$0.updateLicenseStatus(true, true);
   Log.i("MinecraftLicenseCheckerCallback", String.format("allowed reason: %s", var2));
}
```

但是，这个函数是怎么调用的呢？似乎说的是，如果想要成功认证必须执行这个函数，但函数是在哪里执行的呢？

我们打开Logcat，观察MinecraftPE输出的内容。logcat是一个Android调试工具，可以用来查看安卓手机中各个软件输出的、非常有用的调试信息，这里我们直接用Android Studio自带的logcat查看，在过滤器里写上"minecraft"。

经过观察，我们发现logcat中存在类似“LicenseChecker”之类的信息，意识到这可能是与证书校验有关的一个函数，我们立即在源代码中查找。

在源代码中搜索LicenseChecker字样，我们找到了com.googleplay.licensing.LicenseChecker，眼尖的Miyanio酱发现了重点：

```java
public void checkAccess(LicenseCheckerCallback var1) {
  synchronized(this){}

  try {
     if (this.mPolicy.allowAccess()) {
        Log.i("LicenseChecker", "Using cached license response");
        var1.allow(256);
     } else {
        Policy var3 = this.mPolicy;
        NullDeviceLimiter var4 = new NullDeviceLimiter();
        LicenseValidator var2 = new LicenseValidator(var3, var4, var1, this.generateNonce(), this.mPackageName, this.mVersionCode);
        if (this.mService == null) {
           Log.i("LicenseChecker", "Binding to licensing service.");

           try {
              Context var13 = this.mContext;
              String var5 = new String(Base64.decode("Y29tLmFuZHJvaWQudmVuZGluZy5saWNlbnNpbmcuSUxpY2Vuc2luZ1NlcnZpY2U="));
              Intent var12 = new Intent(var5);
              if (var13.bindService(var12.setPackage("com.android.vending"), this, 1)) {
                 this.mPendingChecks.offer(var2);
              } else {
                 Log.e("LicenseChecker", "Could not bind to service.");
                 this.handleServiceConnectionError(var2);
              }
           } catch (SecurityException var9) {
              var1.applicationError(6);
           } catch (Base64DecoderException var10) {
              var10.printStackTrace();
           }
        } else {
           this.mPendingChecks.offer(var2);
           this.runChecks();
        }
     }
  } finally {
     ;
  }

}
```

等等，先不说破解，这段代码非常非常有意思的一点就在于这个“Base64.decode“，为什么好端端的要把字符串给base64编码呢？而且还用这么原始的方法，等我们解码之后，“Y29tLmFuZH...ZpY2U=”对应的正是“com.android.vending.licensing.ILicensingService”，这可能正是幸运破解器等软件绕过验证的主要攻击目标，难道base64真的是幸运破解器无法工作的原因？真相可能已经不得而知了，不过不重要——很快我们就可以拥有自己的破解方法了。

好，我们继续看这段代码。我们几乎可以确定这个函数一定执行了，因为`Log.i("LicenseChecker", "Binding to licensing service.");`的这条日志确实打印在了logcat窗口里，而这个函数又确实执行了验证用户证书的操作——那么，这里的`if (this.mPolicy.allowAccess())`就是我们一直在找的验证重点！我们只要绕过这个allowAccess的验证，直接令`var1.allow(256);`执行就可以了！那，怎么操作呢？

### 修改Smali源代码

还记得我们前面说的吗？在Android反编译实战中，反编译得到的Java代码仅供参考，并不能直接编译。所以我们打开了`class\com\googleplay\licensing\LicenseChecker.smali`，直接搜索checkAccess方法。以下就是函数的完整Smali代码。

```smali
# virtual methods
.method public declared-synchronized checkAccess(Lcom/googleplay/licensing/LicenseCheckerCallback;)V
    .locals 8
    .annotation system Ldalvik/annotation/MethodParameters;
        accessFlags = {
            0x0
        }
        names = {
            "callback"
        }
    .end annotation

    monitor-enter p0

    :try_start_0

    iget-object v0, p0, Lcom/googleplay/licensing/LicenseChecker;->mPolicy:Lcom/googleplay/licensing/Policy;

    invoke-interface {v0}, Lcom/googleplay/licensing/Policy;->allowAccess()Z

    move-result v0

    if-eqz v0, :cond_0

    const-string v0, "LicenseChecker"

    const-string v1, "Using cached license response"

    .line 140
    invoke-static {v0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    const/16 v0, 0x100

    .line 141
    invoke-interface {p1, v0}, Lcom/googleplay/licensing/LicenseCheckerCallback;->allow(I)V

    goto :goto_0

    .line 143
    :cond_0
    new-instance v7, Lcom/googleplay/licensing/LicenseValidator;

    iget-object v1, p0, Lcom/googleplay/licensing/LicenseChecker;->mPolicy:Lcom/googleplay/licensing/Policy;

    new-instance v2, Lcom/googleplay/licensing/NullDeviceLimiter;

    invoke-direct {v2}, Lcom/googleplay/licensing/NullDeviceLimiter;-><init>()V

    .line 144
    invoke-direct {p0}, Lcom/googleplay/licensing/LicenseChecker;->generateNonce()I

    move-result v4

    iget-object v5, p0, Lcom/googleplay/licensing/LicenseChecker;->mPackageName:Ljava/lang/String;

    iget-object v6, p0, Lcom/googleplay/licensing/LicenseChecker;->mVersionCode:Ljava/lang/String;

    move-object v0, v7

    move-object v3, p1

    invoke-direct/range {v0 .. v6}, Lcom/googleplay/licensing/LicenseValidator;-><init>(Lcom/googleplay/licensing/Policy;Lcom/googleplay/licensing/DeviceLimiter;Lcom/googleplay/licensing/LicenseCheckerCallback;ILjava/lang/String;Ljava/lang/String;)V

    .line 146
    iget-object v0, p0, Lcom/googleplay/licensing/LicenseChecker;->mService:Lcom/googleplay/licensing/ILicensingService;

    if-nez v0, :cond_2

    const-string v0, "LicenseChecker"

    const-string v1, "Binding to licensing service."

    .line 147
    invoke-static {v0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 149
    :try_start_1
    iget-object v0, p0, Lcom/googleplay/licensing/LicenseChecker;->mContext:Landroid/content/Context;

    new-instance v1, Landroid/content/Intent;

    new-instance v2, Ljava/lang/String;

    const-string v3, "Y29tLmFuZHJvaWQudmVuZGluZy5saWNlbnNpbmcuSUxpY2Vuc2luZ1NlcnZpY2U="

    .line 153
    invoke-static {v3}, Lcom/googleplay/util/Base64;->decode(Ljava/lang/String;)[B

    move-result-object v3

    invoke-direct {v2, v3}, Ljava/lang/String;-><init>([B)V

    invoke-direct {v1, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v2, "com.android.vending"

    .line 154
    invoke-virtual {v1, v2}, Landroid/content/Intent;->setPackage(Ljava/lang/String;)Landroid/content/Intent;

    move-result-object v1

    const/4 v2, 0x1

    .line 150
    invoke-virtual {v0, v1, p0, v2}, Landroid/content/Context;->bindService(Landroid/content/Intent;Landroid/content/ServiceConnection;I)Z

    move-result v0

    if-eqz v0, :cond_1

    .line 159
    iget-object v0, p0, Lcom/googleplay/licensing/LicenseChecker;->mPendingChecks:Ljava/util/Queue;

    invoke-interface {v0, v7}, Ljava/util/Queue;->offer(Ljava/lang/Object;)Z

    goto :goto_0

    :cond_1
    const-string v0, "LicenseChecker"

    const-string v1, "Could not bind to service."

    .line 161
    invoke-static {v0, v1}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;)I

    .line 162
    invoke-direct {p0, v7}, Lcom/googleplay/licensing/LicenseChecker;->handleServiceConnectionError(Lcom/googleplay/licensing/LicenseValidator;)V
    :try_end_1
    .catch Ljava/lang/SecurityException; {:try_start_1 .. :try_end_1} :catch_1
    .catch Lcom/googleplay/util/Base64DecoderException; {:try_start_1 .. :try_end_1} :catch_0
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    goto :goto_0

    :catch_0
    move-exception p1

    .line 167
    :try_start_2
    invoke-virtual {p1}, Lcom/googleplay/util/Base64DecoderException;->printStackTrace()V

    goto :goto_0

    :catch_1
    const/4 v0, 0x6

    .line 165
    invoke-interface {p1, v0}, Lcom/googleplay/licensing/LicenseCheckerCallback;->applicationError(I)V

    goto :goto_0

    .line 170
    :cond_2
    iget-object p1, p0, Lcom/googleplay/licensing/LicenseChecker;->mPendingChecks:Ljava/util/Queue;

    invoke-interface {p1, v7}, Ljava/util/Queue;->offer(Ljava/lang/Object;)Z

    .line 171
    invoke-direct {p0}, Lcom/googleplay/licensing/LicenseChecker;->runChecks()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    .line 174
    :goto_0
    monitor-exit p0

    return-void

    :catchall_0
    move-exception p1

    monitor-exit p0

    throw p1
.end method
```

好长的方法！不过别慌，我们所想要执行的就是`var1.allow(256)`，眼尖的你应该已经看出来这个语句的位置了——没错，从第25行开始，

```smali
const-string v0, "LicenseChecker"

const-string v1, "Using cached license response"

.line 140
invoke-static {v0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

const/16 v0, 0x100

.line 141
invoke-interface {p1, v0}, Lcom/googleplay/licensing/LicenseCheckerCallback;->allow(I)V
```

Smali代码虽然难看懂，但是对于这种简单的Smali片段，理解起来就非常容易了。我们来理解一下这些代码的具体含义。

两个const-string语句分别向v0和v1寄存器写入了一些字符串，然后就是invoke-static。

invoke-static，顾名思义，这个指令用来调用一个“静态方法”。这里的静态方法和Java里的静态方法一样，是不需要实例化类就可以直接调用的方法。这里调用的i方法"android/util/Log;->i"定义在“android.util.log”名字空间中，签名为`public static int i(@Nullable String tag, @NonNull String msg);`，可以看到两个参数正好对应v0和v1中两个寄存器的值。`i(Ljava/lang/String;Ljava/lang/String;)I`是这个函数的Dalvik签名，i是函数名，括号里是函数接受的两个参数，而I是函数的返回值类型——integer的简称。

我们保留这个log方法，就是因为最后我们会在代码中添加一些日志输出，方便debug时参考。所有以点“.”开头的语句都是注释，在这里忽略。

这个`const/16 v0, 0x100`可能比较费解，为什么定义`0x100`？其实非常简单：0x100就是16进制的256，这个变量正好会作为参数，传递给`var1.allow`方法。

最后一行代码是我们破解的核心。

```
invoke-interface {p1, v0}, Lcom/googleplay/licensing/LicenseCheckerCallback;->allow(I)V
```

`invoke-interface`指令执行一个接口中的方法，这个接口和Java中的接口是一样的。最令人费解的是p1，v0这个参数列表，p1是什么？当前函数定义中没有找到p1啊？哈哈，其实根据smali规范中的规定“All non-static methods accept the object that the method is being called on as the first parameter.”，我们可以知道这个p1就是上文中`var1.allow(256);`中的`var1`，它代表了调用非静态方法时，该方法所处在的对象实例。

com/googleplay/licensing/LicenseCheckerCallback表示我们调用的目标函数，allow(I)V表示函数签名，这个函数接受一个int作为参数，返回类型是空值void。这个函数的实际签名是`void allow(int var1);`，属于抽象类LicenseCheckerCallback所有。我们可以很轻易的找到是谁实现了这个接口——没错，就是`com/mojang/minecraftpe/store/googleplay/GooglePlayStore.java#MinecraftLicenseCheckerCallback`。

这样一来，彻底弄懂了Minecraft的验证机制，就可以很容易的绕过了。

我们将

```
const/16 v0, 0x100
invoke-interface {p1, v0}, Lcom/googleplay/licensing/LicenseCheckerCallback;->allow(I)V
```

这两行代码移动到函数的最前面，`monitor-enter p0`的后面。为什么呢？因为这个方法是异步方法，monitor-enter是一个锁的获得操作，用来确保在异步函数的执行过程中可以访问到必要的资源。

将这两行代码移动到`:try_start_0`的前面，就可以确保无论用户是否真的拥有正版MC，整个验证过程都不再会校验这件事，而是直接返回确认用户拥有的结果，跳过了后面吓人的if-eqz跳转。

但是等等，就算执行了前面的代码，后面的代码还是会继续执行啊！我们必须让函数及时退出才行。如何退出这个方法呢？

因为这个函数本身的返回值就是空的，所以我们直接添加return-void语句。但是这样最后编译出的APK会闪退。为什么呢？因为我们在前面monitor-enter获得了锁，但是没有及时的释放，就导致后面执行的所有操作都因为无法获得锁而失败。我们只需要在return-void之前执行`monitor-exit p0`即可。

这个函数的前面几行最终是这样的：

```smali
# virtual methods
.method public declared-synchronized checkAccess(Lcom/googleplay/licensing/LicenseCheckerCallback;)V
    .locals 8
    .annotation system Ldalvik/annotation/MethodParameters;
        accessFlags = {
            0x0
        }
        names = {
            "callback"
        }
    .end annotation

    monitor-enter p0

    const-string v0, "LicenseCheckerBypass"

    const-string v1, "Cracked by Neboer"

    .line 140
    invoke-static {v0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    const/16 v0, 0x100

    .line 141
    invoke-interface {p1, v0}, Lcom/googleplay/licensing/LicenseCheckerCallback;->allow(I)V

    monitor-exit p0

    return-void

    :try_start_0

    iget-object v0, p0, Lcom/googleplay/licensing/LicenseChecker;->mPolicy:Lcom/googleplay/licensing/Policy;

    invoke-interface {v0}, Lcom/googleplay/licensing/Policy;->allowAccess()Z
```

我们将自己的名字写在log日志中，这样就可以方便的看出是否编译成功。

### 编译，构建，运行，发布

构建命令：

```
java -jar C:\programs\APKEditor-1.3.0.jar b -i decompiled_v1_minecraft -o com.mojang.minecraftpe_modifiedv3.1.apk
```

很快，apkeditor就成功的构建了这个软件，最后执行的结果是非常好的——我们开了一个scrcpy窗口来展示我们软件的运行情况——一次性运行成功，终于绕过了Google验证，我们成功了！

我用Neboer自己的密钥给这个软件签了名，发布在了我们灵动MC群里，供大家下载。至此，我们成功的将Google Play上的Minecraft破解成了可以脱离Google登录的状态，根据群友测试，在无Google框架的安卓手机里也可以正常运行。

![](https://nboater.oss-cn-beijing.aliyuncs.com/BypassMCPE/minecraft_successful_welcom_page.webp)

## 写在后面

这次对MinecraftPE的破解是Neboer人生中真正意义上的第一次亲自参与并取得一定成果的逆向工程实战，其对我的意义非常深远。成功破解了MinecraftPE不但代表我们以后可以稳定获得正版MC应用，而且对服务器宣传会有非常好的正面效果——在移动端普及率如此之高的今天，拥有一个口袋里的MC会极大的方便玩家，让服务器日活增加的同时，也可以提高服务器的知名度，可谓是一举多得。这么一想，我们花费的一天时间似乎也变得值得了起来。

这篇文章转眼就洋洋洒洒写了两万多字，其实到这我是非常感慨的。昨晚我们三个小伙伴线上合作讨论问题，一直研究到很晚，最后破解成功的那一刻我的内心是非常复杂的，本来没想到可以取得这样的成功。在整个工程开始之前，我甚至都没有想过最后可以取得这样的成果——完全没有想过，因为在网上没有找到合适的经验和教程，也没有前车之鉴，也没有大佬分享破解MinecraftPE的文章，在国内甚至买不到正版的MC应用——在国内的Minecraft被一家独大的网易代理的今天，破解MinecraftPE的意义已经远远不是破解本身，更多的是它背后的精神——与大资本对抗的极客精神，虽然我没什么技术力，但是也体验了一把在Mr. Robot里当主角Eillot的感觉（黑客青春版）。

虽然被破解了，但高兴之余还是要引起我们的反思：没有加壳、没有混淆，没有无意义的代码干扰，微软可能压根就没有考虑用技术手段阻止你破解MinecraftPE——这可能是微软对Google Play等软件商店的信任，也可能是微软的傲慢，当然也可能是微软的仁慈，不过我觉得更多的可能体现了微软的气度（没错，虽然前几天刚刚骂过它的产品）。我不知道这么复杂的软件为什么没有混淆，不过我推测可能是因为方便mod修改的原因，也可能是微软压根就没把你放在眼里——毕竟和Java版的售价165元比起来，这个PE版本的MC非常非常便宜，所以玩家几乎没有理由不支持正版——除非他处在几乎完全无法支持正版的中国大陆。希望微软不要像国产软件一样给软件加各种离谱的验证和反编译措施，继续维持MinecraftPE干净、原生的状态，我们也承诺不会在这个破解版的Minecraft里添加任何额外的代码，只保留这些必要的代码和隐晦的破解声明即可，绝对不会影响玩家的正常游戏，最重要的——我们不会宣传这个破解版本，而且对破解MinecraftPE的技术不加任何保留的发在网上，根据NerChat!的遵守的知识共享协议，你可以自由转载文章中的内容，但需要注明原创作者和文章的来源——neboer.site。

感谢Miyanio酱的工作，感谢Eibon，最后希望大家有条件支持正版，可以考虑先购买正版，然后再安装破解版对吧。

最后我们还是说一句，逆向工程和破解是违法行为，本文章所述的内容均只做交流学习之用，不得用于非法用途。


