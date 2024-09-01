---
title: express-joi-validation
title_url: express-joi-validation
type: blog
date: 2020-10-12
updated: 2020-10-13
tags: 
- npm
categories:

big_cover: https://nboater.oss-cn-beijing.aliyuncs.com/npm.webp
small_cover: https://nboater.oss-cn-beijing.aliyuncs.com/hapi.jpg
mark: 60
---
# express-joi-validation
> 从nboat2的一个依赖窥见npm社区的一隅

![](https://nboater.oss-cn-beijing.aliyuncs.com/npm.webp) 

这是一篇比较矫情的文章。

Nboat2的众多依赖项中，有一个库叫做[express-joi-validation](https://github.com/evanshortiss/express-joi-validation)。这个库的主要作用就是负责做请求消毒的，就是检验请求是否合法，字符串长度是否匹配，整数是否合法等问题（如果输入为合法的整数字符串，你还可以选择让它转换成整数）。这个库使用[joi](https://github.com/sideway/joi)作为校验器，joi起到了一种类似schema模板定义语法的作用。为什么用这个库呢？因为我开发的时候在Google上搜“express joi validation middleware”，结果谷歌理所当然的，给了我这个“名字”匹配度最高的库。简单看了一下最后的更新时间和文档用法说明，感觉还不错，本地也就这么用了。

结果我没有注意到的就是，在安装这个库的时候，会出现一段提示，大概意思就是joi这个库已经不再叫`@hapi/joi`了，这个名字的库已经不再支持维护，请直接换成`joi`。现在安装这个库的话，express-joi-validation会提示需要手动安装`@hapi/joi@16`，而安装这个库则会出现以下提示：

```
npm WARN deprecated @hapi/joi@16.1.8: This version has been deprecated and is no longer supported or maintained
npm WARN deprecated @hapi/address@2.1.4: This version has been deprecated and is no longer supported or maintained
npm WARN deprecated @hapi/hoek@8.5.1: This version has been deprecated and is no longer supported or maintained
```

我第一次发现这个问题的时候应该是在我部署第一版Nboat2的时候。在docker构建的过程中出现了类似的报错。我立刻给express-joi-validation开了issue反馈这一问题，并请求它更新依赖项，与此同时我简单看了一下joi和hapi的故事……

根据[这一issue](https://github.com/sideway/joi/issues/2411)，至近来讲七月份的时候joi就已经不再叫做@hapi/joi了。[hapi.js](https://hapi.dev/)是一个nodejs应用框架，可以快速构建服务端和客户端程序，相较于其他模块，它的主张是“给用户更多的拓展性”[^1]，并且更加依赖于中间件的实现。

`@hapi/joi`就是hapi系的中间件众多项目之一。注意这个中间件的维护者[hueniverse](https://github.com/hueniverse)并不是github上[hapi.js](https://github.com/hapijs)组织的成员，并且在这个[issue](https://github.com/hapijs/hapi/issues/4113)中他也没有被提及。在[这里](https://github.com/hapijs/hapi/issues/4111)他阐述了离开@hapi项目的原因（？）——因为许可和领导层以及商业模式的更换，他主动退出此项目组的开发工作。至于hapi到底发生了什么——hapi缺少资金支持，并且在1.16.8.0版本里增加了“商业许可”[^2] ，根据[这个issue](https://github.com/hapijs/hapi/issues/4114)，大概就是所有使用V20版本之前的项目都需要考虑获得许可，也就是说项目的一部分版本不再采用完全开源的模式，借此来盈利。

从我个人来讲，我当然很愿意joi离开hapi组织，我想大家应该都是这么想的。joi是一个非常、非常、非常、非常优秀的json schema validator，最大的优势就是开发简单。在之前我大概只能想到类似jsdocs之类的validator（？），那种开发真的很让人感到疲劳，语法繁琐复杂，并且没有切实的起到“消毒”的作用。joi从hapi中独立出来也可能是为了不受“半开放”的组织的制约，成为一个真正的独立的、属于作者自己的开源项目，这对于整个npm社区来说都是好事——举个例子，这个express-joi-validator就引用了joi这个库，但是它并不是hapi项目组的成员，只是把hapi里的joi搬运到了express框架上。而hapi社区虽然损失了一个优秀的成员项目，但是商业化也可能让其开发者更愿意继续维护并留在社区里，作为体量庞大、众多开发者为了一些共同目的组建的一个项目圈来讲，这未尝不是一件好事。而在网络之外发生的事情比如作者是否可能因为此举丢掉工作之类，暂时不在我们的讨论范围。

所以，还是用爱发电是不够的（虽然没有研究hapi.js之前到底是怎么盈利的），所以爱是会消失的对吧😥。

回到开头我提出的issue，相当长时间内，这个issue都没人理我，后来有一个人提了一个pr，直到发布本文的当天，我写明了“请换用celebrate”然后关闭了这个issue，这个express-joi-validator中间件估计不会开发了。其实很可惜，因为它占据了一个好名字.......这也可能是npm社区的众多问题之一吧。

哦对，所以nboat2在最新的一个commit里放弃了express-joi-validator，跟着joi的步伐转移到了[celebrate](https://github.com/arb/celebrate)，你看看人家的首页README，就喜气洋洋的，让人看着都觉得开朗（其实我应该早点发现这个库的（蛋疼的谷歌），不过现在也没问题了。Nboat2暂时保持一个佛系开发的势头，下一个功能什么时候实现呢？わからないよ～

[^1]: https://auth0.com/blog/developing-restful-apis-with-hapijs/
[^2]: https://hapi.dev/resources/changelog/
