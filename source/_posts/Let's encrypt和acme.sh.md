---
title: Let's encrypt和acme.sh
title_url: lets-encrypt-and-acme-sh
type: blog
date: 2021-06-29
updated: 2021-07-13
tags: 
- letsencrypt
- acme
- 批判！
categories:

big_cover: https://letsencrypt.org/images/isrg-hierarchy.png
small_cover: https://www.hualigs.cn/image/60dfa84a4257f.jpg
mark: 60
---
# Let's encrypt和acme.sh
> 是时候弄清楚neboer.site和它所一直依赖的证书供应商与acme软件之间的关系了……阅读本文之前，我希望你能对浏览器证书、TLS、acme协议等知识有一个大概的前置了解，可能会让你获得更好的阅读体验。

![](https://letsencrypt.org/images/isrg-hierarchy.png) 

本文章主要讲了两件事：

- Let's encrypt签发的证书中有一条证书链依赖的广受信任的旧根证书DST Root CA X3即将在今年9月30日到期，并且Let's encrypt也将不再继续使用直接依赖此证书的证书链。此举将会影响众多没有更新信任根证书列表的老旧设备访问使用Let's encrypt证书的站点，但是得益于交叉签名机制，部分老旧的安卓设备上依然可以正常访问那些网站，这一行为的意义是……
- 通过ACME协议申请SSL证书的知名脚本acme.sh在6月13日起，把自己的默认证书申请网站从Let's encrypt换到了ZeroSSL。开发者们的态度是，此举将不会影响之前一直使用Let's encrypt的站点，并且认为ZeroSSL优于Let's encrypt。但是真的有这么简单吗……

## Let's encrypt想要变得强大

如果说内容是网站的灵魂，证书就是法师画的保护灵魂的符文。现代网站安全通信机制是基于传输安全协议TLS的，证书则是防止中间人攻击、认证网站身份的重要凭证，是权威的CA为我们这种不知名小网站强有力的背书，无论是在密码学意义上还是在背后的精神意义上，一个证书对于一个网站都至关重要。支持HTTPS的网站不但会受到访问者的信任，还会受到搜索引擎的优待，HTTPS也是对来访的人类和机器人的尊重。

Let's encrypt是个人网站开发者们的老功臣了。Let's Encrypt于2012年成立，从2015年9月签发了第一张证书开始，它就一直致力于为开发者提供方便、免费的网站证书申请服务。到2021年3月份，Let's encrypt已经拥有了1.58亿个有效证书，当然neboer.site就是其中之一。

正如文章开头中提到的那样，Let's encrypt也面临着一些问题，虽然都是一些看起来不是问题的问题，但是考虑到如今Let's encrypt庞大的用户群体，任何细小的改变都可能会影响某些人的体验。但是近些年来关于密码学在网络安全上的应用越来越进步，很多CA也不断更新自己的证书签发流程，而Let's encrypt当然也不会例外，所以Let's encrypt需要稳定，同时也需要不断地更新。因此，我们可以看到Let's encrypt不断地更新自己的证书信任链，如果把所有Let's encrypt过去、现在以及未来使用的证书以及它们之间的关系都列出来，其复杂程度不是几句话就可以解释清楚的。因为与本文接下来介绍的内容无关而且会增加理解难度，我们不讨论ECDSA证书的问题，同时也不讨论没有投入使用的备份证书。仅仅讨论正式使用过的有效RSA证书。此外，为了避免歧义，事先声明，所有诸如“X1 X3 R3”之类的写法都是中间证书的简写，并不指代根证书。如果需要明确指定根证书的时候，我这里会把整个证书的名字都打出来，比如“DST Root X3”。分隔线之间的部分为硬核部分，如果看不懂可以简单理解为文章开头中一段的内容。

---

Let's encrypt的一切都开始于一个根证书ISRG Root X1，这个强大的自签名证书同时得到了老牌证书DST Root X3的交叉签名。因此Let's encrypt签发的证书即使在它成立之初，也能迅速获得所有设备的认可，因为Let's encrypt“傍”了“老大哥”IdenTrust。使用这个X1证书，Let's encrypt签发了属于自己的中间证书Let’s Encrypt Authority X1(2015.06.04-2020.06.04)，并在这之后签发了另一个证书Let’s Encrypt Authority X3(2016.10.06-2021.10.06) 。这两个证书都得到了DST Root X3的交叉签名。

在此后的时间里，Let's encrypt就开始使用这个X3证书来签发证书，直到2021年3月，也就是今年3月份，这个X3证书正式到期。这是一个非常明显的改动，因为这也是最近发生的事情！这件事情已经发生了，因此你可以看到Let's encrypt在2021年3月前后为neboer.site签发的两张证书的CN有明显的不同，更早的时候还在使用X3证书，而在四月份就已经用R3作为签发网站证书的父证书了。
![](https://nboater.oss-cn-beijing.aliyuncs.com/Lets%20encrypt%E5%9C%A82021%E5%B9%B43%E6%9C%88CN%E5%8F%98%E5%8C%96.png)
R3是一个长寿的证书，和之前的X3证书一样，这两个证书都是由ISRG Root X1签发，同时经过了DST Root CA X3的交叉签名。因此我们可以看到R3证书包含两个签名，其中一个签名是ISRG Root X1直接签发，有效期持续到2025年；另一个签名由DST Root CA X3签发，有效期……最长也只能和DST Root CA X3同时失效，也就是持续到2021年9月。

Let's encrypt遇到了一个问题，如果DST Root CA X3证书失效，那么最终签发的网站证书在验证的时候就不能再走（以neboer.site为例）DST Root CA X3->R3->neboer.site这条验证链路，而需要变为ISRG Root X1->R3->neboer.site。如果用户的设备并没有接受ISRG Root X1作为根证书的合法性，是不是就意味着这个网站会被标记为“不安全”呢？

事实上，并不是这样。别忘了，ISRG Root X1虽然是一个根证书，但是也是被DST Root X3交叉签名过的。用户可以校验DST Root X3->ISRG Root X1->R3->neboer.site这条链路。但是等等！DST Root X3不是就要在2021年9月之后就过期了吗？为什么还能拿来认证ISRG Root X1的合法性？其实这一点很难解释，因为实际上DST Root X3虽然过期了，但是DST Root X3为ISRG Root X1的交叉签名并没有过期，它的有效性可以持续到2024年，因此如果你的客户端支持校验这个额外的交叉签名，那么即使DST Root X3的自我签名过期，你也依然可以正常访问使用R3签发证书的站点，比如neboer.site。但是如果你客户端使用的SSL模块版本过低无法识别这个交叉签名，那只能出现访问异常问题了。在过低版本的Android设备上、稍低版本的ios设备上都可能遇到这个问题。因此，这次DST根证书过期，对let's encrypt还是有一定影响的。

未来到了2024年9月，DST Root X3为ISRG Root X1的交叉签名也会正式到期。到那个时候，任何使用 依赖ISRG Root X1根证书的中间证书 签发的证书的网站都将会在被不信任ISRG Root X1根证书的设备上报错。这里就包括任何安卓7.1.1之前的设备。事实上根据安卓不同版本操作系统的[市场份额调查](https://www.appbrain.com/stats/top-android-sdk-versions)，这是抛弃了将近**20%**的安卓用户。

---

以上文字是参考了Let's encrypt的数篇文档，在这里统一列出来：

[关于DST Root X3即将到期的声明](https://letsencrypt.org/zh-cn/docs/dst-root-ca-x3-expiration-september-2021/)

[Let's encrypt证书信任链详细解释](https://letsencrypt.org/certificates/)

[Let's encrypt更新证书后客户端适配性](https://community.letsencrypt.org/t/openssl-client-compatibility-changes-for-let-s-encrypt-certificates/143816)

[Let's encrypt生产环境证书链更换](https://community.letsencrypt.org/t/production-chain-changes/150739)

[Let's encrypt借助交叉签名机制延长对于低版本安卓设备的支持时间](https://letsencrypt.org/2020/12/21/extending-android-compatibility.html)

[Let's encrypt的根证书与中间证书](https://letsencrypt.org/2015/06/04/isrg-ca-certs.html)

我第一次注意到Let's encrypt的根证书DST Root CA X3即将到期，并不是从网上知道的。我只是在debug自己网站的时候看到了chrome中记录的证书信息，里面显示这个DST证书的有效期是……2000年10月1日至2021年9月30日？！这不就是今年九月份到期吗，我竟然能有幸见证并且经历一个站了21年岗的根证书的退役……（此处省略∞字个人感慨）于是我搜索了相关的内容，发现Let's encrypt早就意识到这一点了，并且……不打算续签这个证书了！WTF？这是“用完即弃”吗？但是随着更深入的了解，我们知道Let's encrypt有更深远的打算，那就是“own two feet”，使用自己的根证书签发新的证书。

我个人对这件事情的看法是，一个CA没有自己的根证书是难以让人接受的。就好比一个佳能打印机一直用惠普*生产*的油墨（事实上这是不可能的，因为墨盒不通用。打印机一生黑）。Let's encrypt是社区驱动的开放CA，如果一直依赖于别人的根证书，可能会给人造成一种“社区的东西就该低人一等”的感觉，Let's encrypt这次更换根证书，虽然可能造成一些老旧设备支持的问题，但是我觉得网站开发者，尤其是“自由网站”的开发者，还是应该在追求内容和体验的同时，还关注一下网站本身的由来——是什么支持起了你的网站。这当然不是让你给阿里云多充点钱（事实上云服务器供应商是整个网站建设过程中最不“自由”的部分），也没有强制你给Let's encrypt捐款（当然你要是一定要捐款我必然佩服你的境界，这个问题我们可以在之后谈），但是你应该支持Let's encrypt迈出的这一步。有关社区的事情，往往意义会超出事情本身，将来带来的影响必然更会推动社区独立的发展，最终可能会有更大的实惠。所以希望大家还是以长远的眼光看问题。不过再怎么说这也只是我一个人的观点，如果你真的很在意网站用户的体验，不妨换一个继续依赖老牌根证书的CA，比如我们接下来要谈论的ZeroSSL。

还有一些问题，比如2024年9月之后，Let's encrypt要怎么办？真的要抛弃这么多的安卓用户吗？其实这也是一个需要考虑很多因素的问题。这个问题产生的原因我认为并不是Let's encrypt不再支持Android 7之前的设备，而是为什么谷歌支持Android设备的版本更新只包括2-3个版本？如果你是Windows，你只支持一个版本我都没意见，但是你是Android，你更新的速度这么快，过几年就出了一个新版本的操作系统，然后被各种手机厂商各种魔改，到现在已经放出了那么多的不同版本不同架构不同环境的操作系统，然后支持还稀烂……说真的，虽然安卓本身是一个比较开源比较自由的操作系统，但是我还是不认为它是一个很好的系统，主要原因就是生态做的实在是差劲。

不管怎么说，抱怨是没有用的，还是那句话，不喜欢Let's encrypt，就换一个CA呗，反正也都是白嫖，说不定这波Let's encrypt变化之后，大家都一股脑地往外逃，尝试其他的CA，试过了一圈之后，发现还是Let's encrypt最香，最后就变成了人类的本质了，多好！

所以，Let's encrypt想要变得强大，想要变得独立，并且一直在为之努力，我个人是很欣赏这一点的。Let's encrypt在真正做面向未来的打算。不要因为要支持旧设备就一直停滞不前，就好比红帽现在还会管CentOS吗？那世界上真的就没有CentOS用户了？那那些人怎么样了？能怎么样了，都换成Ubuntu了呗！😀

## acme.sh把默认的申请CA换成ZeroSSL了

其实本来这篇文章讲到这里就应该结束了，但是直到昨天晚上我日常用ecma.sh更新neboer.site的证书时，出现了一些问题。如果没有出现这个问题，我甚至不会注意到ecma.sh切换了默认的CA为ZeroSSL，而不再是之前的Let's encrypt的这件事情。

neboer.site一开始也是老老实实使用Let's encrypt官方的ACME客户端——certbot的。但是之前因为一些我现在已经记不得的原因，我听从了群佬的意见，从certbot换成了acme.sh。不得不说acme.sh确实很好用，不但功能和certbot几乎完全一致，而且还是强大的bash脚本，支持多个acme站点，生成的证书可以直接导出，并且不需要root权限……总之在使用之初感觉这个项目又纯粹又好用，是非常不错的acme客户端。

我刚开始用acme.sh的时候，它还是没有什么问题的。默认支持Let's encrypt，也可以在在命令行里设置更换成其他的CA。但是我昨天无意中执行了--update，想想也应该让脚本自我更新一下。然后脚本提示自我更新完毕，然后我执行了`./acme.sh --renew-all`。

acme.sh提示“没有登录ZeroSSL账号，无法继续。”

what?我一直用的是Let's encrypt，怎么就成ZeroSSL了？随后经过简单的检查，我发现在.acme.sh/neboer.site文件夹下的neboer.site.conf文件被修改了，增加了一行`Le_API='https://acme.zerossl.com/v2/DV90'` 。

感到事情不太对劲的我，直接冲进acme.sh的github一探究竟，在issue去清一色的“为什么换到了ZeroSSL”的问题，我：@#￥#！#￥#！%@#%￥……

issue区可以看到许多关于ZeroSSL的问题，基本都是最近提出的，大概就是ZeroSSL证书申请不成功、问为什么换成ZeroSSL、问之前的Let's encrypt为什么换成ZeroSSL了……

再看ZeroSSL，好家伙，一溜证书方案，从最基本的免费版到最高级的$500/month直接给我整不会了，再看看免费版都有哪些功能：可以申请3个90天证书，不能申请多域名证书，不能申请通配符证书，没办法通过REST api控制，没有技术支持。

就这个东西，你说他比Let's encrypt好用？

反正我是不信的。

来来来我们来看看这个ZeroSSL是怎么大言不惭把自己和Let's encrypt比的：https://zerossl.com/letsencrypt-alternative/

对于个人用户，最后三点就是废物，sslmonitor是什么东西？REST api免费用户能用？而且恕我直言我要这个api有啥用？你都支持acme了还要啥api？通过Email验证域名？我为啥要通过邮箱验证域名？1年的证书？呵呵，付费专享？而且你再细看，很多Let's encrypt免费提供的功能，在这里都是要付费用户才可以使用的。比如多域名证书、通配符域名、申请超过3个证书等等……

我很少发这么大火，但是acme.sh这波直接给我整不会了，我现在就是很生气，需要在这里好好发泄一下。

关于为什么acme.sh不再使用Let's encrypt，而是换成了ZeroSSL，在各个地方都有许多不同的说法。让我们看看这个issue：[#3556](https://github.com/acmesh-official/acme.sh/issues/3556)，其中提到的[wiki](https://github.com/acmesh-official/acme.sh/wiki/Change-default-CA-to-ZeroSSL)我看了一下，开发者也没有明确表态“为什么更换”，而就是使用了ZeroSSL官方提供的上面那个“大言不惭”的比较页面作为“理由”，我真的……

其中最让我哭笑不得的，就是用[Let's encrypt官方即将更换DST Root X3为自己的根证书的声明](https://letsencrypt.org/2020/11/06/own-two-feet.html)作为“理由”的，我只是想好好问问你，Let's encrypt这么做有错吗？还是你不支持？你不支持凭什么就要反对？你能代表你脚本使用者的意见吗？你怎么证明你代表了？我所看到的，就是3.0版本的一个[commit](https://github.com/acmesh-official/acme.sh/commit/d0b514890a28d13e83bb06efcfb14651e83360c5)，把默认CA换了，并且，简单的在wiki里介绍了一下，简单的给了一个可笑的比较，回复了几个issue，然后就没有然后了。整个处理态度就两个字：“敷衍”。其实最重要的是，这件事给我的感觉就是，武林高手为了日后变强自废武功，结果被他打工的酒馆把他从保镖降到了房扫，理由就是他武功不如之前好了。

让我们看看Let's encrypt社区里的[讨论](https://community.letsencrypt.org/t/the-acme-sh-will-change-default-ca-to-zerossl-on-august-1st-2021/144052)吧！还是**[Nummer378](https://community.letsencrypt.org/u/Nummer378)** 说得好。

> The change makes sense considering that acme.sh is owned by apilayer and ZeroSSL is an apilayer product - it's kinda first party for them, at least from their ACME support (they basically offer two different products: Certificates via the webinterface and Certificates via ACME, both products have different pricing and different features).

人话：acme.sh是[apilayer](https://apilayer.com/)组织所有的，而ZeroSSL是apilayer的一个产品。

apilayer是个啥？在维基百科上都没有关于apilayer的词条，我们只能从[idera](https://en.wikipedia.org/wiki/Idera,_Inc.)的词条中捕捉到如下信息：“a provider of real-time data API products, was acquired in January 2021.”（apilayer是一个实时数据api提供方，2021年1月成立），访问apilayer官方网站，也可以看到类似的说明。

在此应该插入关于apilayer、ZeroSSL和acme.sh关系的链接，但是我太懒了就没找，等有证据充分，我也有时间的时候，把证据都补上。

所以，所以，所以，acme.sh这个行为真的让我很气愤，我肯定是不会再使用acme.sh作为acme客户端了，至于换成什么，我写文章的现在并不在乎。今天也是不吐不快的一天。

希望各位开源开发者们能认识到自己与社区之间的关系，有一点责任感，做出的每一步更改都要慎之又慎，尤其是用户基数大的项目。acme.sh的这种强行更换默认CA的行为，无异于绑架自己的用户，用惯了开源软件的人可能或多或少都有一点精神洁癖，我在这里对这个项目表示强烈谴责！

