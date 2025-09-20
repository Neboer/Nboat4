---
title: 更科学的安装Arch Linux
title_url: more-scientific-installation-of-archlinux
type: blog
date: 2025-09-20
updated: 2025-09-20
tags: 
  - Arch Linux
  - 引导
  - 安装介质
  - 云服务器
  - GRUB
  - UEFI
categories:

small_cover: https://nboater.oss-cn-beijing.aliyuncs.com/more-scientific-installation-of-archlinux/arch-installer-logo.png
mark: 80
---

# 更科学的安装Arch Linux

Arch Linux因为自由而开源、兼容性强大的生态深受很多人的喜爱，对于使用Arch Linux作为日常的服务器系统的人来说，它的长处和短处都显得有些明显，我们今天就来讨论它的一个很大的问题，并尝试提供一些解决它的技术方法。

为了让Arch Linux更好的在服务器环境（尤其是云环境）中被安装，我们做了很多努力，其中之一便是研究出一种几乎是通用的、几乎可以在任何GRUB2环境中启动、完全运行在ramdisk中的archlinux安装环境。这种安装环境拥有一个更大的优势——如果配置得当并且使用合适的预构建镜像，它可以在没有显示的情况下全程ssh远程安装。当然这不保证成功——你最起码还是有一个可以控制远程服务器重启的方法，不然可能会导致服务器失去联络。

云服务器提供的系统镜像，默认会带有云平台的各种功能组件，其中的很多组件都是没有必要的，会造成一定的性能浪费。同时云服务器厂商可能会对提供给你的镜像做一些其他的修改，如果你觉得这样很不安全，强烈的想安装一个完全由自己控制的操作系统，那这篇文章非常适合你了。

这种方法几乎适合所有云服务器，启动所有有安装iso提供的Linux发行版，只要内存足够将iso装入即可。如果云服务器有第二硬盘当然很好，如果云服务器只有一个硬盘，此方法仍然适用。此方法不只可以安装archlinux，它当然还适合对云服务器进行救援，重分区等操作，取决于你启动的镜像中的系统，它可以实现更多的功能。

比起[VPS2Arch](https://github.com/felixonmars/vps2arch)，我们安装方法更安全更标准，并且成功率更高，支持更广泛。

本文讨论的内容是一种在UEFI环境下的系统安装方法，如果你的服务器不是UEFI，请在一切开始之前，在你的云面板中重装系统成一个UEFI版本的系统（比如Ubuntu UEFI x64）。

## 为什么要这么装系统？

大多数云服务器厂商，都不会提供archlinux镜像作为安装镜像，不为什么，就因为它不够出名。如果你希望在云服务器里安装一个不同的系统可能会相当麻烦，甚至产生一些额外费用。当然，也有一些厂商提供archlinux的镜像，这很好，你可以直接拿来使用。但如果你保留了一些对cloud-init的失望、对云服务器厂商预装bloatware的愤怒、以及可能存在的——对全盘加密的需求（为什么要在云服务器中全盘加密？我不知道啊，问你自己）、希望更换厂商提供的文件系统或内核、离线调试系统故障、为硬盘重新分区（这倒是个很合理的需求）……等等等等想法，那欢迎阅读本文——这篇文章就是为你量身定制的。

目前来看，不通过控制面板，在一台已经装完系统的云服务器中安装一个其他的操作系统的问题很多。目前比较好的方案是，在/tmp之类的位置安装一个你要装的目标系统的最小镜像，然后chroot其中对主系统进行操作。这样的问题也显而易见——对在线运行的Linux进行全系统重写非常危险，并且即使用这种方法也不能修改文件系统本身，毕竟你不能在把一个还在运行的Linux系统的根分区给卸载掉。

还有一些比较邪道的方案，比如制作一个最小启动硬盘镜像，然后给Linux内核加readonly属性，让它只读的挂载根分区，然后再用curl配合dd将这个最小启动硬盘镜像流式写入硬盘，然后重启服务器，进入目标系统。这样操作的问题也很明显——向运行中的Linux系统中强行向根分区所在的磁盘写入数据很危险，尽管系统以只读模式运行，仍然可能会导致系统发生不可逆错误而崩溃，这些方法都是不提倡的，而且前期准备相当麻烦，除非目标服务器的内存特别小（内存低于启动最小archlinux安装镜像的需求比如1G），否则还是不要用这个不太标准的方法安装Linux。

因此，在云服务器中安装Arch Linux一直以来都是一个很“hack”的方法，这也是为什么会有VPS2Arch这种工具的诞生——但VPS2Arch的最大问题就是它支持得并不广泛，而且它并不是高度定制化的安装archlinux，更像是把硬盘里的当前发行版的系统文件替换成了archlinux的系统文件，仅此而已，并无特别。

## Linux的引导

Linux家族中，有很多引导器。在[Arch Wiki中的bootloader一节](https://wiki.archlinux.org/title/Arch_boot_process)我们可以看到比较知名的引导器有如GRUB2、systemd-boot等等。这些引导器的功能有多有少，二进制大小也有大有小。等等，引导一个Linux还需要什么功能？引导Linux难道还需要什么特别的姿势吗？加载linux内核，传入内核参数，加载初始化内存盘，然后BOOOOOOT！

是的，引导Linux是一件很简单的事情，但是在引导Linux之前还需要完成很多的工作。其中最需要我们注意的就是——内核和初始化内存盘在哪呢？

如果是普通的Linux安装，那不需要问——UEFI系统中，内核和初始化内存盘一定存在硬盘的ESP分区之中，也就是Linux的/boot之类的文件夹下。ESP分区是FAT格式的分区，UEFI固件本来就支持读取其中的内容，所以正常情况下引导器只需要利用UEFI的驱动读取这些文件的内容，就可以正常引导起系统，顺利进入Linux了。

但是，如果系统的内核和初始化内存盘，不存在ESP分区之中，又怎么引导Linux呢？

这就是GRUB2真正强大的地方……

## loopback.cfg —— 多启动介质背后的原理

![](https://nboater.oss-cn-beijing.aliyuncs.com/more-scientific-installation-of-archlinux/super_grub2_disk_2.01-rc2_main_menu.png)

你可能会问，内核和初始化内存盘不存在ESP中，又能存在哪？它没必要存在别的地方啊！不要小看这个问题，这个问题与我们的课题——在云服务器中启动Arch Linux安装介质这一目标息息相关。

GRUB2比起其他的引导器，它真正强大的地方在于它的通用性，GRUB2提供了大量的方便的工具，并且其内部自带有多种文件系统的驱动，在GRUB2中不仅可以挂载fat格式的分区，它还支持挂载ext4格式的分区，并且还可以在此之上以loop设备挂载一个iso文件……而这就比较厉害了！我们可以利用GRUB2的这一特性，启动一个位于主ext4分区中的iso文件，比如 /root/archlinux-2025.04.01-x86_64.iso！是的，你没有听错，这是完全可行的。

其实，不必惊讶，这种“从iso文件中启动”的需求听起来是不是有些耳熟？没错，这就是 [SuperGrubDisk](https://www.supergrubdisk.org/) 、[Ventoy](https://www.ventoy.net/) 等知名“多启动介质”启动这些iso文件的原理。但是当然，iso文件中Linux内核和初始化内存盘的位置不总是一样的，并且iso往往还有另外的功能，启动iso并不只是等于启动其中的Linux系统（比如Arch Linux还有memtest86+等多个不同的可启动目标），iso开发者们为了方便多启动介质的GRUB直接获得自己的所有可启动的目标（菜单项），往往会在iso中添加一个额外文件，这个文件就是 /boot/grub/loopback.cfg，每个启动的目标都对应其中的一个菜单项。

在archlinux的loopback.cfg配置中，第二行引用了一段URL，指向了[supergrubdisk的Wiki页面](https://www.supergrubdisk.org/wiki/Loopback.cfg) ，其中说

> A loopback.cfg is basically just a grub.cfg that's designed to be used to boot a live distribution from an iso file on a filesystem rather than an actual physical CD.

这个loopback.cfg其实就是一个grub.cfg，只不过它的作用是引导一个iso中的live环境，而非一个物理介质，比如U盘、CD或一块硬盘。我们找到[archiso中的loopback.cfg配置](https://gitlab.archlinux.org/archlinux/archiso/-/blob/master/configs/releng/grub/loopback.cfg?ref_type=heads)，然后观察一下它里面是什么内容。

```shell
# https://www.supergrubdisk.org/wiki/Loopback.cfg

# Search for the ISO volume
search --no-floppy --set=archiso_img_dev --file "${iso_path}"
probe --set archiso_img_dev_uuid --fs-uuid "${archiso_img_dev}"

# Get a human readable platform identifier
if [ "${grub_platform}" == 'efi' ]; then
    archiso_platform='UEFI'
    if [ "${grub_cpu}" == 'x86_64' ]; then
        archiso_platform="x64 ${archiso_platform}"
    elif [ "${grub_cpu}" == 'i386' ]; then
        archiso_platform="IA32 ${archiso_platform}"
    else
        archiso_platform="${grub_cpu} ${archiso_platform}"
    fi
elif [ "${grub_platform}" == 'pc' ]; then
    archiso_platform='BIOS'
else
    archiso_platform="${grub_cpu} ${grub_platform}"
fi

# Set default menu entry
default=archlinux
timeout=15
timeout_style=menu


# Menu entries

menuentry "Arch Linux (x86_64, ${archiso_platform})" --class arch --class gnu-linux --class gnu --class os --id 'archlinux' {
    set gfxpayload=keep
    linux /arch/boot/x86_64/vmlinuz-linux archisobasedir=arch img_dev=UUID=${archiso_img_dev_uuid} img_loop="${iso_path}"
    initrd /arch/boot/x86_64/initramfs-linux.img
}

if [ "${grub_platform}" == 'efi' -a "${grub_cpu}" == 'x86_64' -a -f '/boot/memtest86+/memtest.efi' ]; then
    menuentry 'Run Memtest86+ (RAM test)' --class memtest86 --class gnu --class tool {
        set gfxpayload=800x600,1024x768
        linux /boot/memtest86+/memtest.efi
    }
fi
if [ "${grub_platform}" == 'pc' -a -f '/boot/memtest86+/memtest' ]; then
    menuentry 'Run Memtest86+ (RAM test)' --class memtest86 --class gnu --class tool {
        set gfxpayload=800x600,1024x768
        linux /boot/memtest86+/memtest
    }
fi
if [ "${grub_platform}" == 'efi' ]; then
    if [ "${grub_cpu}" == 'x86_64' -a -f '/shellx64.efi' ]; then
        menuentry 'UEFI Shell' {
            chainloader /shellx64.efi
        }
    elif [ "${grub_cpu}" == "i386" -a -f '/shellia32.efi' ]; then
        menuentry 'UEFI Shell' {
            chainloader /shellia32.efi
        }
    fi

    menuentry 'UEFI Firmware Settings' --id 'uefi-firmware' {
        fwsetup
    }
fi

menuentry 'System shutdown' --class shutdown --class poweroff {
    echo 'System shutting down...'
    halt
}

menuentry 'System restart' --class reboot --class restart {
    echo 'System rebooting...'
    reboot
}
```

整个配置文件很长，但其实关键的核心只有几句话，我们把他们拆出来看：

```shell
search --no-floppy --set=archiso_img_dev --file "${iso_path}"
probe --set archiso_img_dev_uuid --fs-uuid "${archiso_img_dev}"
linux /arch/boot/x86_64/vmlinuz-linux archisobasedir=arch img_dev=UUID=${archiso_img_dev_uuid} img_loop="${iso_path}"
initrd /arch/boot/x86_64/initramfs-linux.img
```

iso_path 是来自上级GRUB2配置中的环境变量。GRUB2有一个 configfile 命令，类似于”source“，可以从一个配置文件中启动另一个配置文件，保留这个文件中为其设置的环境变量。在supergrubdisk的源代码[autoiso.cfg](https://github.com/supergrub/supergrub/blob/07c41b7c8093f13d6b53e45caead56096bf87209/menus/sgd/autoiso.cfg#L45)中我们可以找到类似的逻辑。

这里的search是GRUB2的命令，用途是去搜索一个拥有${iso_path}的设备，保存在archiso_img_dev变量中，这是一个很保险的做法，因为这样就不需要手动指定某个具体的设备，而是“有这个文件的设备”。GRUB阶段，Linux内核并没有启动，GRUB2看到的硬盘和分区都是类似 (hd0,gpt2) 这样的设备和分区，顺序可能并不固定或不好确定，因此search命令通过枚举文件很好的解决了这个问题。

probe 主要是获取archiso所在分区中文件系统的uuid，这个参数是需要传递给linux内核的。后面设置linux和initrd，就可以正常启动iso中的Linux内核了。

但当然，不是所有的内核/初始化内存盘都支持从iso中启动，这是一个很复杂、很特别的启动环境。

## archiso的启动

和普通的Linux相比，archiso有哪些特别的地方呢？在开始之前，我们先回顾一下普通Linux内核是如何启动的。

### 硬盘中的Linux启动流程

1. **UEFI/BIOS** → 加载 EFI 引导程序（比如 `grubx64.efi`）。
2. **GRUB** → 加载 Linux 内核 (`vmlinuz`) 和 initramfs (`initramfs-linux.img`)，把控制权交给内核。
3. **内核启动** → 识别硬件、挂载 initramfs 作为临时根。
4. **initramfs 的 init 脚本运行** → （archlinux中可能由systemd或busybox提供hook）解析内核命令行 (`root=...`)，找到真正的 root 分区（通常是 ext4/btrfs/lvm），挂载到 `/new_root`。
5. 切换根（`switch_root`）→ 执行真正系统的 `/sbin/init`（systemd）。

这个引导过程中，我们最关心的一步就是根的切换。因为Linux的根分区可能需要解密等操作才可以被正确识别，所以initramfs必须做一些工作，识别本地磁盘设备，让根分区可以被正确的mount到某个位置，然后整个启动流程才能继续。

### archiso中的Linux启动流程

在archiso中，情况略有不同。

首先，GRUB2通过搜索，从硬盘中读取到archiso安装盘，并将此硬盘及其所在分区保存在变量中。

然后，GRUB2将这个iso挂载为loopback设备，加载其中的linux内核与initramfs。

现在GRUB2已经拿到了iso的内核与initramfs这两个文件的内容，它直接将按标准内核启动的流程，成功的启动了loopback中的Linux系统。现在，GRUB2的工作已经结束，*刚刚启动的内核在一片陌生的环境中醒来，能否引导进安装环境就完全依靠他自己和前世记忆（内存盘）了*。

所以，initramfs中的hook——archiso就非常重要和关键了，它几乎是linux启动后在内存盘中开始执行的第一个hook，它是archiso中的linux有别于普通Linux的重要标志。`archiso` hook 的主要任务包括：

1. 挂载根文件系统
   - 识别并挂载自己的“出生环境”iso镜像，从 ISO 中找到并挂载只读的 `airootfs.sfs`。
2. 支持参数化启动
   - hook 会读取内核启动参数，例如 `img_dev=...`、`img_loop=...`，用来定位 ISO 镜像以及其中的文件。
   - 这些参数实际上就是传递给 `archiso` hook 的，它决定了启动时如何找到和挂载真正的根文件系统。
3. 校验完整性
   - 使用 sha512sum / GPG / openssl或CMS 等多种方式进行完整性校验。
4. 复制到 RAM 运行
   - 如果传入 `copytoram=y`，archiso 会把整个 ISO 镜像复制进内存，然后再挂载运行。这样就可以卸载光盘或弹出 U 盘，Live 系统依然能继续运行。
5. 创建写层
   - 在只读文件系统上创建一个写入层，可以在物理磁盘持久化，也可以在内存中临时放写入的内容
6. 清理 ISO 挂载
   - 如果拷贝进内存，则最后要清理iso挂载。

因此，可以看到 Arch Linux 安装介质的启动过程和普通 Linux 的启动参数并不相同，这些过程又有额外的参数控制。这并不是 GRUB 特意做了什么，而是因为 initramfs 中额外包含了 archiso 这个 hook，它在内存盘阶段从iso文件中准备出了一个Linux环境，让系统能够从 ISO 镜像中找到并挂载真正的根文件系统。

## 在GRUB2中启动archiso安装盘

终于，我们要开始了，我们即将在GRUB2中配置现有Linux启动archiso安装介质，然后重启系统进入镜像中。

### 获取合适的ISO镜像

在开始之前，你需要下载合适的Arch Linux安装盘镜像，将它放在主分区中的某个指定位置，比如在 /root/ 下。.

根据[ArchWiki中有关archiso的描述](https://wiki.archlinux.org/title/Archiso)，平时我们在各大镜像站上下载的Arch Linux安装镜像（比如清华源中的“获取下载链接”中提供的Arch Linux的安装镜像下载地址，通常是类似 https://mirrors.tuna.tsinghua.edu.cn/archlinux/iso/latest/archlinux-.xxxxxxxx-x86_64.iso 这种链接，一般提供的是由archiso所打出的全功能安装镜像，其配置文件名叫 releng。我们以后默认所用的安装镜像就是 releng。但releng镜像比较大，需要大概2G的内存才可以在内存中启动，

### 配置GRUB2引导archiso

为了实现在一个grub引导的Linux中安装Arch Linux，我们需要做的只有一件事——添加配置项，配置这个系统的GRUB2引导我们放在硬盘分区中的iso镜像文件，并且以拷贝进内存的形式启动这个镜像文件中的系统。这个配置项会被设置成下次开机的时候的第一启动项，并且如果启动失败，自动fallback到普通启动。

很显然，这个配置很重要。我们经过一段时间的研究，使用如下配置即可。

/etc/grub.d/40_custom

```bash
#!/bin/sh
exec tail -n +3 $0
# This file provides an easy way to add custom menu entries.  Simply type the
# menu entries you want to add after this comment.  Be careful not to change
# the 'exec tail' line above.
menuentry "Boot Arch Linux ISO" {
	set default=0
	set fallback=1

    set iso_path="/root/archlinux-2025.07.01-x86_64.iso"
    export iso_path
    search --no-floppy --set=root --file $iso_path
    loopback looparchiso $iso_path
    set root=(looparchiso)
    search --no-floppy --set=archiso_img_dev --file "${iso_path}"
    probe --set archiso_img_dev_uuid --fs-uuid "${archiso_img_dev}"
    linux /arch/boot/x86_64/vmlinuz-linux archisobasedir=arch img_dev=UUID=${archiso_img_dev_uuid} img_loop="${iso_path}" copytoram=y
    initrd /arch/boot/x86_64/initramfs-linux.img
}
```

为什么要单独使用它的配置文件，而不是 chainload archiso中提供的loopback.cfg呢？因为我们要改一些内核参数，比如 copytoram=y 强制要求内核一定要复制到内存里再启动，而不是占用已挂载的硬盘空间（怎么能在已经挂载了的硬盘上重新分区呢！）

这个 /etc/grub.d/40_custom 文件，是用来给用户提供一个自定义的grub menu entry的，正好用来给我们存放临时启动linux iso的配置文件。在执行 `grub-mkconfig -o /boot/grub/grub.cfg` 之前，最好确定一下这个文件是可执行的，生成之后检查一下 grub.cfg 中有没有这个菜单项。

好的，那么一切准备妥当，准备设置重启目标并重启。只需要执行 `grub-reboot "Boot Arch Linux ISO"` 就可以设置下次重启的目标，然后 `reboot` 重启系统。如果一切顺利，你可以在救援环境的VNC里，看到archiso被成功的引导了。就算启动失败也没关系，它会自动重启回到第一个grub启动项，也就是你原来安装的Linux系统中。

## 一些注意事项

我们大量研究这个方法，发现了很多坑。他们覆盖grub2版本、UEFI、安全启动、cloud-init、loopback设备重名、救援VNC、云服务器的内存等各个方面，如果你想要在云服务器或者其他主机中用此种方法安装Arch Linux，请务必多加小心。

### GRUB 2.06以前的版本加载loop设备失败

[GRUB2](https://ftp.gnu.org/gnu/grub/)一般每两年放出一个新版本，目前你安装云服务器能遇到的GRUB2版本有两个，一个是grub-2.06，一个是grub-2.12。

在包括Debian 12及以前的Debian版本，Debian使用的GRUB2都是grub-2.06，这个版本的GRUB2在loop功能上存在缺陷，实测难以启动Arch Linux的ISO，**总是**会报错“out of memory”，但实际上主机的内存是足够加载这个loop的。在grub-2.12中这个问题得到了修复，所以请尽量使用新一些的发行版提供的GRUB2来启动Arch Linux的安装盘。

这个问题的修复我粗略的认为可能与 2023 年 1 月份的[一些提交](https://github.com/rhboot/grub2/commit/c9176aebab53644c1a029052d03ee4aeac40318f)有关，新版本GRUB改善了内存分配相关的逻辑，应该是可以从UEFI固件中请求分配出更大块的内存给loopback文件，从而让比较大的loopback iso可以挂载。

grub2的版本可以随便用一个类似的命令获得，比如`grub-file --version`。如果你不幸发现系统中的grub2是旧版（显示的版本号低于2.12，比如2.06），那么你需要重新安装系统中的GRUB2。这在Debian12上（我们用Debian12举例子）几乎是不可能的。

GRUB 2.12版本及之后的引导器，增加了loop设备重名校验。因为担心和任何已有的loop设备重名，上文中提供的配置文件将loop设备命名成了 `looparchiso`，几乎不可能和现有的任何loop设备重名。如果你也遇到了重名之类的报错，那就请修改你的loop设备名，然后重启系统即可。 

#### 在Debian12中强行安装新版GRUB2

如果你实在需要在Debian12之类的系统中安装新版GRUB2（这很可能也是你需要使用此方法重装系统的原因），而不希望升级系统，只希望升级GRUB2这一个包，你可以采用如下方法：（以Debian12为例）

1. 首先需要添加experimental仓库到 /etc/apt/source.list 中。

   `deb https://deb.debian.org/debian experimental main`

   或者你可以使用清华源。

   `deb https://mirrors.tuna.tsinghua.edu.cn/debian/ experimental main`

2. 下载grub-efi-amd64-signed包：

   `apt -t experimental download grub-efi-amd64-signed`

3. 强行安装

   `dpkg --force-all -i ...` 其中 -i 后面跟着你刚刚下载的那个 .deb 包的文件名。

在这一步之后，GRUB2会自动安装进系统的efi环境中，你现在已经拥有了最新的GRUB2，可以直接生成grub.cfg，然后重启系统进入Arch Linux安装环境了。

### Arch Linux安装盘不受安全启动信任

老生常谈的问题。Arch Linux提供的安装iso是不支持安全启动的。如果你使用了类似 debian-cloud 之类的云镜像作为提供GRUB2的系统，那么请你务必检查一下GRUB2是否要求安全启动。如果GRUB2要求安全启动，那它就不能用来启动Arch Linux的安装盘，因为它没有受信任的安全启动的签名。所以，在继续之前，你务必检查你的环境是否开启了安全启动。一些云服务器提供商会在控制面板中写明“安全启动”等字样，如果没有找到类似字样，可以在系统中确认，以下提供一些确认的方法。

- 你可以使用 `mokutil --sb-state` 来检查，如果提示 `SecureBoot enabled` 则启用了安全启动，如果是 disabled 则安全启动没有启用
- 你还需要检查内核是否开启了lockdown，`cat /proc/sys/kernel/lockdown`  或 `cat /sys/kernel/security/lockdown`
  - 如果结果是 `[none]`，则说明内核没有lockdown，可以放心启动其他镜像。
  - 如果结果是 `[integrity]` 或 `[confidentiality]` ，说明 lockdown 已启用，意味着内核要求严格遵循 Secure Boot 签名规则。

安全启动，尤其是Linux发行版的安全启动，是一个很大的话题，尤其是涉及到Arch Linux，这个话题更大了，如果展开讲清楚又要说很多东西。本文并不深入讨论安全启动相关的问题，我们会在以后出更多的文章讨论Linux安全启动的事。我们只是在这里提供一些方法，你可以利用它们来检查自己的系统是否是安全启动状态，进而推理自己的环境是否需要安全启动、自己的GRUB是否强制要求内核支持安全启动。

### 从内存或其他磁盘中启动

经过我们的实际测试，archiso releng，也就是可以在各大镜像站直接下载到的archiso构建的全功能安装镜像，需要大约2GB的内存空间启动（copy to ram）。如果你的云服务器刚好有2GB的内存空间，经过我们的测试应该是可以正常启动的。如果云服务器内存仅有512MB，那肯定是启动不了的。这种情况下，对小内存服务器，可以考虑网络启动或GRUB2引导一个alpine镜像， 然后在alpine中用qemu-image将archlinux的预构建QCOW2硬盘镜像写进物理磁盘中。这部分的内容在后面会有提及。当然如果你的内存为1GB左右，你也可以构建一个精简的、支持从ISO启动的baseline镜像，这样它就可以在小内存主机中启动了，这个也会在后文中提及。

如果你的服务器除了主硬盘外，还有一块额外的、空间充足的盘（必须是物理磁盘，不能是虚拟的分区），比如Azure中的某些实例类型会有一个备用盘，这个盘在服务器重置后数据会被清空，但重启会保留启动的数据，这样它就可以单独拿来做一个引导设备，不需要大内存来装载iso为loop设备了。你只需要将光盘通过dd写入其中，然后修改efiboot参数，从这块写了iso的硬盘启动，便不需要依赖内存盘，可以直接进入到第二硬盘提供存储的Arch Linux环境中，你可以在这个系统中对第一硬盘进行重新分区，不会影响当前系统的正常工作。

不过，如果内存实在是太小，比如512M内存，即使你服务器有第二硬盘，依然无法启动Arch Linux的安装ISO。因为这个内存512M实在是太小了，它连initramfs 都装不下，会引起Linux启动时崩溃。这个问题同样可以通过构建自己的支持从iso引导的baseline版本的安装iso来解决，因为自己构建的iso中打入的HOOK较少，安装的软件也不多，所以生成的initramfs可能会刚好足够在系统中启动，这一点只能依靠大家自己研究了。

### cloud-init、archiso ssh登录、网络配置

如今，几乎所有的云服务器厂商都已经支持了cloud-init，如果你是直接在云服务器厂商的市场中搜索并安装的镜像，那么大概率你目前的云服务器采用cloud-init配置服务器。cloud-init的功能非常之多，并且已经是云服务器镜像的事实标准，如果你还不知道cloud-init是什么，推荐去阅读相关的教程。我们建议在你开始重装云服务器的系统之前，务必了解cloud-init是什么。笼统来说，loud-init启动器在Linux启动过程中，通过读取Linux中的一个额外的小磁盘中记录的配置，来动态生成主机的ssh密钥、ssh配置、网络配置等等对一台Linux服务器而言至关重要的配置，最终让主机顺利上网，用户可以方便的远程访问主机。

cloud-init 中我们最关心的功能就是两个——ssh用户配置与网络配置。

`ls /run/cloud-init/`查看你云服务器中cloud-init的运行时动态生成的工作路径，如果这个路径存在，那么说明你的云服务器是使用cloud-init启动的。你需要回忆起你在创建云服务器的时候，输入的那个用户名和密码或者ssh公钥（ssh密钥真方便，不是吗？），这个配置不仅可以用来启动你当前的系统，还可以用来启动所有依赖cloud-init进行配置的系统，archiso的releng版本也支持cloud-init，所以理论上讲，archiso在启动之后会自动完成对自身的配置并启动网络和ssh远程连接，你只需要用同样的用户和密码或ssh密钥登录安装好后的archiso就可以了。

当然，你也需要确认一下云服务器的网络是DHCP指派的子网地址，而非手动指定。因为archiso默认使用DHCP连接网络，如果手动指定的话，如果没有cloud-init archiso就无法上网。不过就算有cloud-init，还是要小心archiso中的Linux系统可能无法识别cloud-init所在的磁盘。在PVE中，cloud-init介质一般有两种通道—— IDE或SATA。archiso中的内核不支持读取IDE通道的存储设备，所以如果你配置了IDE通道的cloud-init，archiso在启动后可能无法正确识别并加载cloud-init中的配置，这一点需要额外注意，但在Linux内部也很难分辨出某个设备是SATA设备还是IDE设备，这一点就希望大家多留心各种面板中的信息了。

如果你所处的环境没有cloud-init，也没有DHCP分配网络地址，而且你还希望在系统启动后能理解使用SSH连接，……（许愿池的王八啊！）我还真就解决了一次类似的问题，方法就是构建一个自己的archiso镜像，将公钥、网络配置等直接添加进去，这个在后文中会提到。

### UEFI引导

我之前说了，原系统必须是UEFI引导，其实如果原系统不是UEFI引导，问题也不会很大，因为我们这个操作压根和引导没有关系——我们其实只是配置了GRUB2启动另外一个Linux内核与内存盘，本质上和UEFI启动顺序、MBR引导加载等并没有什么关系，只要BIOS固件可以启动GRUB2，就可以启动Arch Linux安装介质。所以在这个方法中，是不需要通过efibootmgr之类的工具修改引导加载顺序的。

但是，一旦你在容器中把系统安装完成，这个时候引导顺序就非常重要了。系统安装完成之后一定要修改引导顺序，让BIOS启动你刚刚安装在硬盘中正确的引导器（而不是原来的GRUB2），在安装完成之后一定要反复反复的检查引导，确保新安装的archlinux系统可以被正确的引导，并且确保UEFI启动项中不再有旧的GRUB2条目！否则，一旦引导失败，你将难以修复此问题——除非重置服务器或者使用救援盘启动，或者如果面板支持，可以在面板中手动将从硬盘引导设为首选启动项也可以。

### 救援显示

你是否有能力连接到服务器的VNC非常重要。

大多数云服务器厂商都提供VNC连接功能，自建机房基础设施中也应该有类似的远程访问服务器的显示并发送键盘的能力。一旦服务器启动失败，你可以从远程访问的屏幕上看到错误日志或错误报告，可以修复后再上传。类似Azure的服务器则是提供串口访问的能力，正常情况下GRUB2会向串口发送启动信息，串口也可以用来传递键盘按键，进而实现启动项的选择等功能，可以理解成与VNC几乎功能相同，缺点就是不能在串口中调整BIOS设置。你最好还拥有可以随时重置服务器系统的能力，这样就不怕把服务器刷机刷坏了导致服务器无法启动。

大多数时候VNC都可以清晰明确的显示出错误来，但有些云厂商的VNC，可能是arch内核对其framebuffer实现得不好，会出现严重的虚影和显示错位等问题。这个问题应该可以解决，但显然我不清楚是怎么回事。

![](https://nboater.oss-cn-beijing.aliyuncs.com/more-scientific-installation-of-archlinux/%E9%98%BF%E9%87%8C%E4%BA%91%E7%9A%84VNC%E4%B8%8A%E4%B8%80%E7%89%87%E6%B7%B7%E4%B9%B1%E7%9A%84%E5%90%AF%E5%8A%A8%E6%97%A5%E5%BF%97.png)

## 构建自己的archiso镜像

使用官方提供的iso镜像可能存在各种不方便，所以出于各种需要，你可能考虑构建自己的archiso镜像并安装它。

构建自己的archiso非常简单，你只需要在一台Arch Linux主机中，安装 archiso 软件，然后根据[官方文档](https://wiki.archlinux.org/title/Archiso)所指示的那样安装即可。

archiso的构建一般从两个不同的profile开始：releng或baseline。其中releng支持的功能最全，占用内存最大，是网络上发布的archiso镜像，大约1.3G左右；baseline则是一个小镜像，只有0.5G左右大小，但不支持包括WiFi连接相关的大多数软件包，也不支持从iso文件启动引导，仅支持基本的功能。如果你想要构建一个可以从iso中引导的baseline大小的镜像，可以参考本章。推荐在性能不足、内存不够的主机中使用baseline镜像，更容易引导成功。

### 配置ssh用户和网络

无论是releng还是baseline，你构建archiso的主要目的可能就是配置一些默认连接的用户和网络。

### 配置ssh用户

配置ssh用户的方法在archwiki相关章节中写得非常清楚。不过添加ssh用户有些时候并无必要，仅配置一个root密码即可。

使用任何一个Linux发行版，利用openssl生成密码。

```bash
openssl passwd -6 -salt <optional_salt_string> <your_password>
```

这样，root密码就配好了。

注意，ArchISO安装镜像，是默认root用户可以通过密码登录的。但ArchISO默认的root用户密码是未设置，所以无论输什么都不会允许登录。当我们通过这个方法设置了root密码之后，可以直接用此密码连接至archiso安装环境，方便的同时也让连接变得有些危险，所以这个密码应该强一些。

### 配置网络

archiso使用systemd-networkd联网，如果你的目标系统不是DHCP联网，你需要修改archiso中自带的默认网络配置。否则一般不需要修改，保持默认就好。

`archlive/airootfs/etc/systemd/network/20-ethernet.network`在这个文件中，将`[NetWork]`部分修改为你需要的网络配置，比如配置一个静态网络：

```ini
[Address]
Address=10.0.1.102/24

[Match]
MACAddress=1c:86:24:55:b2:6a

[Network]
DHCP=ipv6
DNS=10.0.1.53 114.114.114.114
Domains=guest
IPv6AcceptRA=true

[Route]
Gateway=10.0.1.1
```

这个网络配置中，IPv6由DHCPv6服务器提供，而IPv4地址和子网需要主机自己静态声明。并且需要配置网关、DNS等信息。

需要注意的是，archiso并不知道自己会被安装到哪个具体的主机上，所以在archiso中配置网络连接时，我们也不知道目标主机是否可以利用这个network配置上网——废话，我又不是目标主机！刚才那个配置中的Match部分匹配了一个目标的MAC地址——前提是你知道这个服务器网卡的MAC地址。用这种方法配置可以避免主机有多个网络接口时带来的命名混乱引起的网络配置错误问题。

### 构建可以在iso中启动的baseline镜像

baseline镜像默认带有的功能很少，它甚至不支持从ISO中启动。究其原因，是因为baseline的initramfs中缺少archiso 提供的 loop hook，因此不能正确的识别并加载iso文件中的squashfs。如果需要构建一个支持iso启动的baseline镜像，最好的方法就是将 archiso_loop_mnt 添加进archiso的mkinitcpio的HOOK表中。

archiso_loop_mnt 也是 mkinitcpio-archiso 包提供的HOOK，无论是releng还是baseline配置，这个包都是默认安装的，所以你只需要将HOOK打进内存盘中即可。

修改 `archlive/airootfs/etc/mkinitcpio.conf.d/archiso.conf` 中的内容为

```bash
HOOKS=(base udev modconf memdisk archiso archiso_loop_mnt block filesystems keyboard)
```

根据wiki中的提示，这些HOOK的顺序非常关键。尤其是这个keyboard是wiki中推荐添加的hook，这样可以支持在initramfs环境下使用键盘输入，在普通的Linux系统中通常用来输入密码解锁LUKS加密的硬盘，但在这里支持键盘输入对一些救援工作的开展可能有利。

构建这样的镜像的命令是 `mkarchiso -v -w /tmp/archiso-tmp archlive` ，之后再生成的时候记得将/tmp/archiso-tmp archlive路径清空，否则可能会影响构建过程。使用 /tmp 路径需要占用一些内存来获得更快的访问速度，如果内存不足，就在硬盘中写这个临时文件即可。

## 给安装镜像添加更多功能

你可能还需要构建的镜像有更多方便的功能，这里列举一些可选的增强功能。

#### 终端自动登录

配置root密码后，默认登录将不再直接进入 root 窗口，而是需要输入root密码。对于云服务器来说，这是几乎完全没有必要的——因为只有你自己可以访问到VNC界面，在VNC里输入密码即非必要又不安全，所以即使配置了root密码，也可以让getty自动登录root账户（这和ssh没有任何关系，ssh该输密码还要输密码）

编辑 `archlive/airootfs/etc/systemd/system/getty@tty1.service.d/autologin.conf`文件，配置其内容为

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear %I 38400 linux
```

这个配置文件会在开机时自动启动，自动登录当前shell。

#### cloud-init

没错又是cloud-init，没想到吧！

即使是在baseline配置中，cloud-init也是默认安装并在登录时启用的。这确保了你的iso可以支持cloud-init。

所以，你不需要关心cloud-init相关的问题，archiso的配置已经帮你处理好了。

#### 文本编辑器

你需要一个文本编辑器，不然你是真的没有办法在连不上网的时候修改相关的配置文件。

修改 `archlive/packages.x86_64` ，在里面添加一行 `vim`

#### 换源

archiso自带了一堆各地区的镜像源，这并不好用。比如我们希望镜像直接使用清华源，直接编辑 `archlive/airootfs/etc/pacman.d/mirrorlist` 文件，写入

```bash
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch
```

这样就成功换了清华源。

#### 进入镜像后需要导入GPG公钥

这个配置文件中不包括archlinux-keyring，所以当你启动iso镜像中的系统之后，你即使换了源，执行pacman -Syu之后也不能直接安装软件，会提示证书错误。这个时候需要执行 `pacman-key --init`然后就可以正常安装软件了。

#### archinstall

archlinux官方开发了快速安装archlinux的脚本archinstall，这个脚本在releng中默认添加，但在baseline中则没有。这个脚本需要装的软件包并不大，只有Python和一些依赖。使用archinstall可以自动化大多数在硬盘中安装archlinux的繁琐步骤，推荐将此软件包添加进package列表中。

至此，我们便讨论完了本文的第一部分内容，如何在一个内存充足的服务器中方便的启动一的releng的archiso安装镜像环境，并完成系统的安装。我们接下来要讨论在内存不足的服务器中，如何使用Arch Linux的预构建硬盘镜像来完成系统安装，同样这个方法也不局限于Arch Linux，有一定的迁移性。



---



在前面，我们主要讨论了在GRUB2中启动Arch Linux安装介质的方法来安装Arch Linux到系统中，这种方法灵活性强，适应性广泛，但最大的缺点就是需要较大的内存，同时构建自定义的镜像比较麻烦。我们下面介绍另外一种在已有Linux中安装Arch Linux的方法，该方法通过配合自定义apkovl包，网络启动一个完全运行在内存中的Alpine Linux，我们登录之后直接向硬盘中写入archlinux发布的预构建好的硬盘镜像，然后调整分区、根据需要调整系统设置，配置ssh用户等，最后成功完成安装，调整UEFI启动设置，重新启动系统进入archlinux中。

考虑到这可能确实是一个实际存在的需求，所以我们深入的讨论一下，将它展开作为文章的第二部分。

## 将预构建硬盘镜像直接写入硬盘

Arch Linux还发布预构建硬盘镜像，可以直接拿来当成启动硬盘来使用，这也是各云服务器提供商支持安装Arch Linux的主要方法。

### Arch Linux的预构建硬盘镜像

同所有发行版一样，Arch Linux也有发布预构建硬盘镜像。所谓预构建硬盘镜像，就是一个qcow2压缩磁盘文件，是QEMU的格式的，可以直接当成一个“虚拟硬盘”启动，本来Arch Linux发行此qcow2硬盘镜像是为了方便云服务器厂商和类似PVE/VirtManager这种虚拟化管理平台方便快速的创建Arch Linux主机的，在这里我们也可以拿它们用作方便易得的磁盘文件，省去了安装的步骤，直接将此文件拆包后写入硬盘。

此镜像的构建系统发布在archlinux自己的GitLab上 <https://gitlab.archlinux.org/archlinux/arch-boxes> 。清华大学的镜像源提供Archlinux预构建硬盘镜像的，可以直接从tuna的镜像站上获取。<https://mirrors.tuna.tsinghua.edu.cn/archlinux/images/latest/>

arch-boxes发布两种不同的硬盘镜像，basic和cloudimg，其区别和联系如下：

|                 | basic      | cloudimg    |
| --------------- | ---------- | ----------- |
| 文件大小        | 较小 400M+ | 较大 500M+  |
| 展开后磁盘大小  | 40GB       | 2GB         |
| 剩余空间        | 38.4G(97%) | 397.2M(36%) |
| 主分区文件系统  | btrfs      | btrfs       |
| 带有cloud-init  | 无         | 有          |
| 启动方式        | GRUB2      | GRUB2       |
| 目标环境        | 个人PC     | 云服务器    |
| 登录用户名/密码 | arch/arch  | 无          |

basic的分区结构

| Start  | End      | Sectors  | Size  | Type  |
| ------ | -------- | -------- | ----- | ----- |
| 2048   | 4095     | 2048     | 1M    | BIOS  |
| 4096   | 618495   | 614400   | 300M  | EFI   |
| 618496 | 83884031 | 83265536 | 39.7G | Linux |

cloudimg的分区结构

| Start  | End     | Sectors | Size | Type  |
| ------ | ------- | ------- | ---- | ----- |
| 2048   | 4095    | 2048    | 1M   | BIOS  |
| 4096   | 618495  | 614400  | 300M | EFI   |
| 618496 | 4192255 | 3573760 | 1.7G | Linux |

### 在最小内存系统中覆写磁盘

如果想要在小内存服务器里安装Arch Linux，那就必须先启动一个完全在内存中运行的、轻量的安装环境。所以我建议使用Alpine作为一个过渡的内存中运行的系统。整个安装的大概步骤分为如下几步：

1. 在当前Linux中，下载Alpine的网络启动器，添加UEFI启动项并重启，从网络启动Alpine
2. 在Alpine中，流式的从网络将Arch Linux cloudimg的qcow2镜像写入主机磁盘
3. 使用cfdisk修复磁盘容量，挂载主分区，btrfs扩容
4. 添加默认用户，网络配置，卸载cloud-init，设置root密码，时区，本地化，键盘布局……
5. 修改UEFI启动项为默认从硬盘启动
6. 重启主机，进入Arch Linux，安装完成

我们接下来详细讨论其中的每个关键步骤。

### Alpine、apkovl与ipxe网络启动

大多数人对Alpine了解不多，不过Alpine确实是完美适合这个任务的操作系统——它非常非常小。完全在内存中运行的Alpine环境只占120M内存左右，因此Alpine基本可以无障碍的启动到小内存的Linux主机的内存中，不需要实际的硬盘。

那么如何方便的启动Alpine系统呢？我们这里使用的方法是网络启动。首先使用ipxe制作一个UEFI网络启动固件，然后使用efibootmgr之类的工具将它设置为默认启动项，然后启动它。alpine支持通过apkovl进行系统配置，也支持通过URL指定一个你自己的公钥文件，你可以将自己的配置打包上传到某些直链网盘中，启动固件会在系统启动时读取并加载它，自动启动ssh，并且自动允许你登录，这些方便的功能都是alpine自带的配置方法，就是为了方便进行安装和调试。我们找到了项目 https://github.com/macmpi/alpine-linux-headless-bootstrap 。

我们使用以下alpine ipxe引导器配置。

```shell
#!ipxe

dhcp
set mirror http://mirrors.tuna.tsinghua.edu.cn

set flavor virt
set cmdline modules=loop,squashfs quiet nomodeset
set img-url ${mirror}/alpine/latest-stable/releases/x86_64/netboot
set repo-url ${mirror}/alpine/latest-stable/main
set modloop-url ${img-url}/modloop-${flavor}
set apkovl-url http://example.com/headless-alpine.apkovl.tar.gz
set ssh-key-url http://example.com/ids/id_ed25519.pub

imgfree
kernel ${img-url}/vmlinuz-${flavor} ${cmdline} alpine_repo=${repo-url} modloop=${modloop-url} console=tty0 apkovl=${apkovl-url} ssh_key=${ssh_key} modloop_verify=no
initrd ${img-url}/initramfs-${flavor}

boot
```

以上配置中，有如下需要你自己准备

- apkovl-url ：你自己的apkovl配置包的URL，比如 http://example.com/headless-alpine.apkovl.tar.gz ，把它替换成你自己提供的文件地址，当然我们这里直接建议使用上面那个github项目中提供的apkovl即可，不需要多余的配置。当然，这里还是需要你自己用一个HTTP服务器 serve 它，而不是直接利用GitHub上的HTTPS链接。
- ssh-key-url ：你自己的ssh公钥地址，比如 http://example.com/ids/id_ed25519.pub ，把它替换成你自己提供的公钥的下载地址。

#### 构建嵌入此配置的ipxe UEFI镜像

先准备ipxe构建环境

```bash
# First we'll clone iPXE
git clone git://git.ipxe.org/ipxe.git
# Go into the src directory of the cloned git repo
cd ipxe/src
```

然后，将准备好的ipxe配置写入 `ipxe/src/embed.ipxe`

最后，启动构建

```bash
make bin-x86_64-efi/ipxe.efi
```

这样，你准备好的efi启动文件就已经存在了ipxe.efi中，接下来只需要把它拷贝到ESP分区，就可以设置UEFI启动项了。

#### 配置启动项启动Alpine UEFI网络系统

```bash
efibootmgr --create --disk /dev/sda --part 1 --loader /EFI/BOOT/alpine-netboot-head
less.efi --label "Alpine Netboot" --unicode
```

大概使用efibootmgr编写一条这样的命令，就添加了一条alpine的启动项，再用 `efibootmgr --bootnext 000X` 设置下次从这项启动。

重新启动，如果一切顺利，就会成功进入ipxe环境，过一阵就可以登录alpine了。由于你已经在前面的ipxe内核命令行中指定了ssh-key，你只需要使用配套的私钥去连接服务器，就可以顺利完成认证并建立连接了。ssh是默认安装好且自动启动的，网络也是会自动配好的，这一切都不需要担心。

### 网络挂载qcow2写入完整磁盘镜像

使用 qemu-img 可以很轻易的将虚拟磁盘镜像在各种格式之间互相转换。但 qemu-img 不支持流式读取镜像。这就意味着你需要将qcow2下载到本地，然后再使用qemu-img流式写入磁盘，完成安装。在小内存服务器中，由于服务器内存很小，所以根本不可能有那么大的空间在内存盘中下载安装qcow2的文件镜像，所以你要么将文件镜像下载进第二磁盘或什么别的地方，要么想办法将镜像站里的网络文件地址“挂载”成系统中的某个文件供qemu-img操作，这个工作是由httpfs2完成的。

#### httpfs2

httpfs2是一个很古老的软件，是更古老的httpfs的更新的版本，它基于FUSE2，我们能想到使用这个软件“网络挂载”一个iso镜像也是惊世智慧了。

别看了，alpine中没有httpfs2这个包——说不定未来我心情好了会向社区贡献一个（雾），我们主要讨论一下如何构建一个Alpine上运行的httpfs2.

1. 首先，需要准备一个AlpineLinux的环境。AlpineLinux的安装镜像本身也是一个完整的内存alpine系统，我建议如果只是为了构建的话就不需要安装alpine到硬盘了，直接启动内存alpine就可以了，本文采用的alpine版本是 [standard-3.22.1](https://mirrors.tuna.tsinghua.edu.cn/alpine/latest-stable/releases/x86_64/alpine-standard-3.22.1-x86_64.iso) 。

2. https://sourceforge.net/projects/httpfs 上有托管httpfs2的代码，只需要下载其中的httpfs2项目即可。
3. 换源。注意还需要添加community仓库。
   1. `echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/latest-stable/main" >> /etc/apk/repositories` 
   2. `echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/latest-stable/community" >> /etc/apk/repositories`
4. 安装构建环境依赖，`apk add build-base gcc wget git`
5. 安装fuse、fuse-dev、asciidoc。`apk add fuse fuse-dev asciidoc`

准备就绪，进入 httpfs2 的源码中， make

不出所料，构建成功。实际 httpfs2 只有一个简单的小源代码文件，构建起来非常容易。

#### 挂载镜像站上的qcow2文件

接下来就是挂载了。我们建议把httpfs2运行在前端，用screen托管。httpfs2需要一个基础目录，首先创建 /mnt/archcloudimg 目录，然后使用命令`./httpfs2 -f http://mirrors.tuna.tsinghua.edu.cn/archlinux/images/latest/Arch-Linux-x86_64-cloudimg.qcow2  /mnt/archcloudimg` 完成挂载，实际请参考镜像站提供的最新qcow2镜像的最新URL。注意这里我们使用cloudimg是因为它展开之后确实很小，比较不容易因为硬盘空间不足而导致写入截断。还有一个细节就是注意使用HTTP协议。

执行 `file /mnt/archcloudimg/Arch-Linux-x86_64-cloudimg.qcow2` 检查一下，如果一切正常你会看到 file 返回了正确的文件类型`QEMU QCOW Image (v2)`。

那很好了。至此我们就成功的将qcow2文件挂载到了系统目录里，可以像正常操作文件一样，将它流式的写入磁盘了。

### 全盘写入、分区处理

接下来即将进行最重要的工作，就是磁盘的写入与处理分区。首先，我们使用qemu-img将这个网络挂载的“文件”写进我们的硬盘中。

需要一些软件： `apk add qemu-img cfdisk lsblk`

#### 镜像转换写入磁盘

全盘写入 `qemu-img convert -p -O raw /mnt/archcloudimg/Arch-Linux-x86_64-cloudimg.qcow2 /dev/vda`

这里将qcow2镜像写入了磁盘 /dev/vda，在写入之前请分辨好你要写入的目标磁盘。因为网络文件系统毕竟还是会比较慢，所以需要多等一阵。有的时候仿佛转换的进度不动卡死了，耐心等待就好，整个操作完成大概需要10分钟左右。

如果写入完成，那恭喜你，一切顺利！

#### 调整分区表

由于qcow2磁盘肯定和我们的硬盘不一样大小，而且主分区大小太小，占不满硬盘空间，所以我们需要调整分区。

`cfdisk /dev/vda` 调整磁盘分区。cfdisk可能会提示磁盘分区表记载的磁盘大小与实际磁盘大小不匹配，这个不需要关心，我们需要在cfdisk里把最后一个分区调整到与硬盘尾扇区一样大小，然后Write保存进磁盘。这一步还会通知系统同步磁盘信息，为后面的进一步定制系统做准备。

`lsblk -f` 观察一下，如果不出意外会有类似如下的输出：

```
localhost:~# lsblk -f
NAME   FSTYPE   FSVER LABEL                    UUID                                 FSAVAIL FSUSE% MOUNTPOINTS
loop0  squashfs                                                                           0   100% /.modloop
sr0    iso9660        alpine-std 3.22.1 x86_64 2025-05-13-11-10-00-00                     0   100% /media/cdrom
vda
├─vda1
├─vda2 vfat                                    0A16-77F2
└─vda3 btrfs                                   434d1458-3ec7-4781-baa9-3491ce070d23
```

#### 挂载根文件系统

接下来是对rootfs进行操作，完成系统的最后安装的时候了。我们希望进入rootfs完成系统安装，就必须将rootfs挂载到系统上并chroot进去。很显然Arch Linux默认的btrfs文件系统给我们带来了一些额外的负担：AlpineLinux需要安装`btrfs-prog`并启用btrfs内核模块才能正确挂载btrfs文件系统的分区。

```bash
apk add btrfs-prog
modprobe btrfs
```

然后就可以用 mount 将 /dev/vda3 挂载到 /mnt/archroot 上——但是先不要挂载，我有话要说。

#### 考虑btrfs文件系统压缩以及cloudimg的磁盘挂载过程

在cloudimg中，默认根分区 / 挂载参数启用了压缩，对小内存的低性能主机而言，btrfs的压缩可能会造成额外的算力浪费，对系统造成的影响远大于它带来的好处。因此我们需要以不压缩的方法挂载btrfs，然后对其进行全盘碎片重建，就可以将现有的磁盘压缩给覆盖掉。

现在你还不需要做出什么修改，你可以先在内心选择一下是否要保留btrfs的文件系统压缩。由于 Arch Linux 的 cloudimg 的磁盘挂载机制复杂，对这个地方进行修改比较麻烦，如果你觉得自己的内存确实小到需要考虑这个性能影响，请继续向下看。

正常的Arch Linux安装，系统的挂载配置一般都写在 /etc/fstab 里，由 systemd-fstab-generator 负责解析，为其中的为每个条目生成对应的 `.mount` 和 `.swap` 单元文件，放在 `/run/systemd/generator/`；而在cloudimg中，磁盘的挂载配置和普通的Linux系统很不一样。cloudimg中的根分区和boot分区是由 [systemd-gpt-auto-generator](https://www.freedesktop.org/software/systemd/man/latest/systemd-gpt-auto-generator.html) 实现的，根据其文档可以看出，它对根分区的识别和自动挂载是通过[内核命令行参数](https://www.freedesktop.org/software/systemd/man/latest/systemd-gpt-auto-generator.html#root=)的 `root=`, `rootfstype=`, `rootflags=` 实现的。cloudimg内核默认的命令行参数是

 `BOOT_IMAGE=/boot/vmlinuz-linux root=UUID=434d1458-3ec7-4781-baa9-3491ce070d23 rw net.ifnames=0 rootflags=compress-force=zstd console=tty0 console=ttyS0,115200` 

可以看到，它在 rootflags 中指定了 `compress-force=zstd` ，所以影响了挂载选项。如果想要解决这个问题，需要把 /dev/vda2 也一并挂载到 /mnt/archroot/boot 下，然后调整 grub2 配置。这个步骤可以在chroot之后完成，也可以在第一次重启后完成——我没什么建议，看你想法。

如果你想要修改这个值，那你请把 boot 挂载上，然后在后面的步骤里按步骤操作即可。

#### 检查、调整与优化btrfs根文件系统

在前文中，我们只是扩张了btrfs文件系统所在分区的分区大小，我们接下来要扩展btrfs文件系统，使其与新的分区大小相匹配。

在一切开始之前，先检查系统健康度。

`btrfs check /dev/vda3`

这个只能在磁盘未挂载状态下进行，一旦检查通过，就可以挂载磁盘到系统目录

`mount -o rw,relatime,compress-force=zstd /dev/vda3 /mnt/archroot`

注意，如果你希望关闭默认的btrfs压缩，需要不加compress的挂载目录。

`mount -o rw,relatime /dev/vda3 /mnt/archroot`

并且如果你需要调整grub设置，那还需要把 /dev/vda2 的vfat BOOT分区挂载上。

`mount /dev/vda2 /mnt/archroot/boot`



如果磁盘检查一切正常，观察文件系统的状态

`btrfs filesystem df /mnt/archroot`

如果文件系统一切正常，则可以扩展至整个分区，执行

`btrfs filesystem resize max /mnt/archroot`

即可，btrfs会自动处理并扩展分区。

你这个时候可以稍微优化一下btrfs文件系统，主要就是平衡与去碎片。

`btrfs balance start /mnt/archroot`

这个命令会平衡文件系统中的各个节点，优化btrfs的存储结构。

接下来你可以给btrfs文件系统去碎片

`btrfs filesystem defragment -r -v /mnt/archroot`

执行这个命令，可以减少文件系统的存储碎片。注意如果你在挂载时没有指定`compress-force=zstd`，那么这个去碎片的操作本质上是取消当前文件系统存储结构的压缩状态，所以需要一些额外的处理时间。

#### 进入chroot环境

接下来就是Chroot的时间了。alpine的community仓库中有 arch-install-script 包，直接安装即可。安装好之后，系统中会有 arch-chroot 命令，这个就是我们需要的。但是如果你现在直接执行，它会报一些和 mount 命令相关的错误。这是因为 arch-chroot 脚本中使用的 mount 命令来自 linux-utils，而AlpineLinux中默认的mount命令来自于busybox，两个mount是完全不一样的。解决问题的方法也很简单，只需要安装 linux-utils 包即可。

现在我们成功使用 arch-chroot 进入了 /mnt/archroot 里，我们接下来就可以对系统rootfs进行随意的调整了。我们没有挂载那个 vfat 分区，这是因为没有必要——写入的整盘系统就是完整的安装镜像，我们不需要再去安装引导了，我们只需要在最后设定引导项从此硬盘启动即可。

#### 在chroot中调整系统

接下来就没有任何好说的了，一般的流程是

1. 修改root密码
2. 执行`pacman-key --init`
3. 安装vim
4. 换源
5. 配置root公钥或允许root登录或添加第三方用户/安装sudo/配置sudo权限
6. 编写systemd-networkd网络配置，让新系统可以自动连接到网络
7. 启用systemd-networkd、sshd （一般是已启用的）
8. 配置主机名
9. 时区、locale、时间同步可选配置，推荐进入系统之后再调整

这些步骤在前面已经多次提及，这里不再赘述。

这些步骤可以手动完成，或者如果你希望尊重云服务器厂商的 cloud-init （使用cloud-init会让系统启动时间稍稍变长，但同时也可以让系统的密码等可以通过面板等方法手动控制，各有好坏，自行选择），你也可以什么也不做，让cloud-init自动为你完成。如果你决定不使用cloud-init（我比较建议不要用cloud-init），可以直接使用pacman将cloud-init卸载掉，只要你确保你的配置正确，这是完全没有问题的。



如果你需要修改启动时命令行参数，要求btrfs不再以压缩模式挂载根分区，那么你需要修改grub配置并重新生成grub启动项。

打开 `/etc/default/grub` 文件，修改其中的 `GRUB_CMDLINE_LINUX_DEFAULT="rootflags=compress-force=zstd console=tty0 console=ttyS0,115200" ` 行，将rootflags去掉，然后重新生成 grub 配置， `grub-mkconfig -o /boot/grub/grub.cfg` 完成。

这样一来，你就彻底解决了btrfs压缩的问题，透明压缩会默认关闭不再启动。

### 修改启动项

最后，就是修改UEFI启动项，让UEFI从我们刚刚配好的这个硬盘中启动。如果你是云服务器环境，可以通过修改面板中的配置实现，当然更方便的方法就是使用efibootmgr添加启动项，从硬盘的默认启动文件中启动即可。

`efibootmgr -c -d /dev/vda -p 2 -L "Arch Linux (vda)" -l '\EFI\boot\bootx64.efi'`

这个命令指的是从 /dev/vda2 分区启动，一般对应的都是那个 vfat 格式的文件系统所在的分区。

值得一提的是（那可太值得了），Arch Linux的这个cloudimg云镜像所采用的启动器竟然是grub2，而不是systemd-boot。我个人认为这可能是应对云服务器复杂的启动条件所致。grub2的启动和加载比systemd-boot要慢一些，同时grub2也是一个比较古老的引导器（上文中也说过了），但是grub2支持的功能更多，会为系统失败提供更多的救援功能。我个人建议是如果你的云服务器支持VNC或串口访问系统控制台的话那保留grub2引导没什么大问题，如果不支持的话还是用systemd-boot比较简单，引导器这种东西当然可以在你第一次启动系统之后自己在系统里更换，这里就不必多讲了。



重新启动，进入系统，完成安装。

## 写在后面

为什么我们要研究在如此苛责的条件下安装archlinux的方法？难道安装archlinux的方法，不就是选一个镜像然后安装吗？不就是插一个U盘然后从U盘启动，安装系统吗？为什么要搞得这么复杂？

因为我们UntilSoftware有一个赞助者提供的服务器，这个系统又是Debian12、又是静态IP、又有安全启动、又使用cloud-init部署、它的cloud-init所在的磁盘是由PVE通过IDE协议提供的！简直是buff叠满。甚至这个服务器一开始都没有VNC显示，我们的任务就是把这个服务器从Debian 12刷成Arch Linux，彻底解决它每次启动需要3分钟的智障问题。

不过服务器里的Arch Linux安装环境总是启动失败，后来我才想到可能是服务器开了安全启动的原因，在有了VNC连接之后才进到BIOS里把安全启动关掉，然后才成功引导起了Arch Linux安装镜像。我们将之前的Debian12完全铲除，也没有安装cloud-init，而是用手动配置网络和用户。这样服务器的开机速度提升了很多，同时也可以更流程的对接到我们的Man8S工作流中去了，实在是可喜可贺，可喜可贺啊。

另外写到这里，本来想锐评一下阿里云在内的国内云服务器厂商不提供Arch Linux镜像这件事的，但是我突然发现其实他们是提供的——这真是没有想到。阿里云的镜像市场里确实有archlinux镜像（虽然版本有点落后），这下压力来到了Azure的一边（

![](https://nboater.oss-cn-beijing.aliyuncs.com/more-scientific-installation-of-archlinux/%E9%98%BF%E9%87%8C%E4%BA%91%E9%95%9C%E5%83%8F%E5%B8%82%E5%9C%BA%E6%94%AF%E6%8C%81%E5%AE%89%E8%A3%85ArchLinux%E6%93%8D%E4%BD%9C%E7%B3%BB%E7%BB%9F.png)

这篇文章使用的信息经过了我很多的实验，我们确保这些信息在我们本地环境中是可以复现的。如果您在使用这些方法的过程中有不明确或有问题的地方，欢迎随时和我联系。
