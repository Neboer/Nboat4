---
title: Typora 发布正式版，成为收费软件
title_url: typora-release-official-version-and-become-a-paid-software
type: blog
date: 2021-12-13
updated: 2021-12-13
tags: 
- Typora
- 批判！
categories:

big_cover: https://nboater.oss-cn-beijing.aliyuncs.com/typora-eye.jpg
small_cover: https://nboater.oss-cn-beijing.aliyuncs.com/typora_logo.png
mark: 85
---
# Typora 发布正式版，成为收费软件
> Typora是我非常喜欢的一个markdown编辑器，我之前几乎所有的博文都是在Typora上编写的，这软件现在要钱了（直白）。这篇文章应该是neboer.site上第一篇用Abricotine编写的markdown文档。

![](https://nboater.oss-cn-beijing.aliyuncs.com/typora-eye.jpg) 

## Typora发布1.0正式版

Typora是一个专业的markdown编辑器。markdown编辑器分为很多种，Typora更倾向于所见即所得。neboer.site的设计逻辑是编辑器+网页预览功能。一般情况下鼓励用编辑器写好文档，然后上传到网站上。写文章的过程中我面对最多的，应该就是markdown编辑器了。

一个很好的编辑器对内容创作者来说非常重要，之前Typora更新很快，很好看，简洁干净，我也本身非常愿意去使用这个软件。直到2021年11月23日 Typora.io发布了Typora的1.0正式版，结束了从0.8.5 (beta)以来接近6年的免费生涯。

## Typora不是自由软件

Typora **不是** 开源软件，但是长得 **特别像** 开源软件，它长得太符合我脑中固执的审美以至于我个人把它理想化了，这是我的问题。

Typora在GitHub上有一个自己的账号[Typora](https://github.com/typora)，但是别误会，这里没有这个软件的源代码，以前没有，现在也没有，以后更不会有。Typora在这个仓库里保存一些自己的网站、文档，还提供一个issue区供大家交流，这些和我用过的很多开源项目都十分相似，比如[Mineflayer社区](https://github.com/PrismarineJS/mineflayer)、[Qv项目组](https://github.com/Qv2ray/Qv2ray)等等。

Typora的网站确实说过自己是或者将会是**付费**软件，但是它这个说明的字体很小，位于下载链接下方。而且这个说明随着网站不断更新也在逐渐变化。为此我亲自翻阅了https://web.archive.org/web/\*/https://typora.io/ ，详情请参阅文章的## A Brief History of Typora部分。

## 谷歌对于Typora的分类有重大错误
Google是一个还算不错的搜索引擎。熟悉我文章的人看到这，大概能知到我又要开始炮轰谷歌了，没错，超级瞄准已经部署，现在让我们开炮吧。

![](https://nboater.oss-cn-beijing.aliyuncs.com/Typora%20Google%E6%90%9C%E7%B4%A2%E7%BB%93%E6%9E%9C%E6%88%AA%E5%9B%BE.png)

Typora是一个商业软件，Google当然也是一个商业公司。Typora出现在Google的搜索结果之中说明不了任何问题，这非常合理，合情合理。但是Typora还出现在了Google对于“开源markdown编辑器”的搜索结果的推荐列表中——这就很不对了！
我在Google上输入“open source markdown editor”，排名第一的推荐竟然是Typora，第三个搜索结果就是Typora的官方网站，可是Typora压根就**不是** 一个开源软件，它甚至都不是一个免费软件！而谷歌的搜索结果中赫然写明了“Freeware”！Google本身对于Typora的分类也有重大问题，它把Typora分类到了“Text editor Software/Open-source software/Markdown”目录下，正如我之前所说，Typora不是开源软件，这个分类是**大错特错**的。也就是说，根据谷歌的这份搜索结果，Typora是一个FOSS软件，可是它压根就既不free也不OSS，我对Google的评价就是，小编也没有用过这个软件，但是小编觉得它很好，小编随便写个列表，就推荐你来使用哦~我超！真有你的，谷歌！

实际上，我就是被谷歌这个分类给骗了。我真的把Typora当做了一个很棒的开源软件，还感慨了一段时间。我压根就没想过它是一个彻头彻尾的商业软件，我只能说，我too young了。我已经向Google递交了feedback，如果Google联系了我或者给予了相应的措施，那么我会更新这篇文章的内容。
![](https://nboater.oss-cn-beijing.aliyuncs.com/%E6%88%91%E5%90%91Google%E9%80%92%E4%BA%A4%E7%9A%84%E5%8F%8D%E9%A6%88.png)
## A Brief History of Typora 《

Typora的官方网站typora.io，根据Who.is上的信息，typora这个网站的注册时间是2014-11-03，真的是七年之前。

Wayback machine上抓取的第一个Typora备份在2014年12月1日。可以看到在那个时候Typora就有相对来说比较精美的页面设计了。那个时候的Typora还只是一个mac软件，并不支持\*nix和windows。同时Typora并没有开放下载，希望获得这个软件的人需要输入自己的邮箱地址，然后获得一份这个软件的拷贝，同时Typora会默认提醒你软件发布了更新。这个做法本身就很有宣传意味。

我亲自爬取了webarchive.org，抓取了typora.io这个网站的banner的所有的1159个历史版本，然后分析了其中这一行小字是如何变化的。结果内容如下（记录之间用空格分隔，记录中可能包含空格。）：
```yaml
'2014-12-01': '* Avaliable for mac OS X 10.9 and after. Windows version is still on
  the way. *

  '
'2015-05-07': '* Free during beta. Avaliable for mac OS X 10.9 and after. Windows
  version is still on the way. *

  '
'2015-07-07': '* Free during beta. Avaliable for mac OS X 10.9 and after. Change Log
  *

  '
'2015-09-02': '* Free during beta. Avaliable for mac OS X 10.9 and after. Change Log
  + History Builds *

  '
'2015-12-28': '* Free during beta. Available for mac OS X 10.9 and after. Change Log
  + History Builds *

  '
'2018-01-21': '* Only free during beta. Available for mac OS X 10.9 and later. Change
  Log + History Builds *

  '
'2018-08-27': '* Free during beta. Available for mac OS X 10.10 and later. Change
  Log + History Builds *'
'2019-06-23': '* Free during beta. Available for mac OS X 10.13 and later. Change
  Log + History Builds *'
'2020-06-03': '* Free during beta. Available for mac OS X 10.13.4 and later. Change
  Log + History Builds *'
'2021-04-25': '/* Free during beta. Available for mac OS X 10.14 and later. Change
  Log + History Builds */

  /* Typora will finally cost 9 ~ 15$ per license, subscribe to get notified when
  it get out of beta. */'
'2021-11-26': All / History Releases / What's New / Download for Other Platforms /
  Purchase FAQ
```
你看，信息内容最完整的一句话应该是“/\* Free during beta. ...  \/* Typora will finally cost 9 ~ 15$ per license, subscribe to get notified when  it get out of beta. \*/”，但是这句话仅仅放在网站上放了六个月，就被最后的收费版内容替换掉了。
其次，还有一句话叫做“Only free during beta.”，这句话的'only'提供的信息也隐含了“以后要收费”的事实，但是这句话也仅仅放了七个月多就被从网站上换回了一直以来的“ Free during beta”。

Free during beta是很费解的一句话，什么叫测试期免费？你不如直接说正式版收费！事实上在我下载的时候网站上根本没有提供任何正式版收费的相关信息，我看到的就是2019-06-23开始的“Free during beta”。这句话让我误以为它是一个正在积极开发中的开源免费软件，目前还没有正式版，事实上这个软件整整测试了7年，发出正式版之后直接开始收费，我……

根据[similarweb](https://www.similarweb.com/zh/website/typora.io/#overview)上的数据，截至目前typora.io在最近6个月内的总访问量为848.20K。访问的用户大多位于中国，其次是美国，the USA。

## Typora是一个好用的软件
不得不承认的是，Typora是一个非常好用的软件。在Google搜索结果中的几个测评说的确实没有问题。使用Typora的时候我看到的就是渲染出来的最终文档，只要我愿意我还可以随时切换到编辑模式去编辑源代码。使用体验和操作都非常好，界面当然也非常简洁，不但没有任何广告，甚至连花里胡哨的颜色都没有，只有单纯的白色背景和黑色的文字，不得不说这软件在美学设计上是十分过关的。

在实际使用体验上，它的开启速度很快，性能不差，对于cjk的支持也很到位，默认就支持微软雅黑。中文显示没有问题。同时在编辑的时候隐去了标签，我在屏幕上看到的就是最终在网页上呈现的，这一点使得它比左边源代码右边预览图的编辑环境更加直观，也更加亲民，适合各种写手使用。

Typora几乎不支持markdown的所有扩展标准，比如不支持`^[1]`注释，不支持表格的渲染，不过对于一个面向写手（而不是开发者）的markdown编辑器来说，这些已经足够了。

Typora有特别多的替代软件，各大网站的测评写的很清楚，我不再赘述了。

## Typora让我非常无奈
我可以说，Typora把我给“骗”了。再进一步，Typora和Google合伙来来 骗，来 偷袭我一个69岁的老同志！它巧妙地伪装让我信以为真，它真切地伤害了一个开源爱好者的心灵（我这心灵是有多脆弱哈哈哈），让我对“开源精神万岁”的向往又减少了一分。

Typora让我非常无奈。一方面它确实是一个好用的软件，另一方面它的替代品总觉得不如它。我现在在用开源的Abricotine，但是我觉得它没有Typora好用，不是踩一捧一，用惯了typora可能喜欢上了它的单色调设计，喜欢它的既视感界面，而不是源代码和渲染后的内容混合在一起，造成许多视觉上的不直观。

VScode可能也是一个不错的选择，但是说到底它也就是左代码右文档，而且如果只是为了写Markdown而打开VScode就很有一种用一把野外生存的复合瑞士军刀去给家里刚刚洗好的苹果削皮的感觉，可以用而且很好用，但是因为不是专用工具因此总觉得不圆满。

Typora是一个很好的软件，虽然它伤了我的心，但是我依然会想念用Typora打文档的那段时间的。我当然可以继续使用之前的Typora免费版本，但是那样更不是一个好的选择。只能说暂时抱着一颗发现好软件的心，把自己对Typora的喜欢投射到新的软件上。
## 写在后面
既然Typora对是否收费的说法有点暧昧不清，那Neboer就明确的表态：Neboer不会用neboer.site来赚一分钱。如果你真的喜欢本站，或者说想要对Neboer表示感谢，想要表达些什么，欢迎来NerChat!里和我交流，同时请把开源精神讲给更多的朋友们听，这就是我的愿望，我认为这比全世界所有的财富总和都珍贵！谢谢~

