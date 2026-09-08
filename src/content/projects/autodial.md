---
title: AutoDial — 宽带自动拨号守护
description: 纯 PowerShell 守护脚本：宽带 PPPoE 掉线 / 僵死会话自动重拨
pubDate: 2026-09-07
tags:
  - PowerShell
  - 自动化
  - 网络
featured: false
githubUrl: https://github.com/Je-qljx/AutoDial
order: 4
---

> 网线插在宽带光猫链路上、但 PPPoE 会话未连接(或会话僵死无法上网)时,自动拨号恢复宽带。全程只操作「宽带连接」一个拨号条目,不改路由、不改网卡、不碰其他网络。

## 项目简介

家用宽带光猫工作在桥接模式、由电脑直接 PPPoE 拨号时,运营商可能不定期踢掉会话,光猫/线路抖动也会造成断线或「会话在但实际不通」的僵死状态——人不在电脑前(挂机下载、远程桌面)断网就等于失联,而 Windows 自带的「断线重拨」既不处理僵死会话,也不区分网线插在哪个网络,插错线路时会误拨别人的宽带。

AutoDial 是一个**纯 PowerShell 守护脚本**(Windows 自带 PowerShell 5.1,零第三方依赖):开机自启后每 15 秒巡检一轮,发现异常即用系统已保存的凭据自动拨号恢复。

## 功能特性

- **周期性巡检** — 默认每 15 秒一轮:网线在位 → 会话状态 → 连通性探测;开机前 120 秒用 5 秒密节拍尽早捕获网络就绪时刻。
- **真实连通性验证** — 会话在时对 `223.5.5.5 / 119.29.29.29 / 114.114.114.114` 并行做 TCP 53 握手(IP 直连、不依赖 DNS),任一通过即视为正常。
- **僵死会话恢复** — 会话在但连续 3 轮探测全部失败时,自动断开会话并重新拨号。
- **链路指纹防误拨** — 将光猫 MAC、IPv6 链路本地地址与运营商网段前缀存为指纹(`gateway.mac`);网线插到公司内网等其他网络时特征不匹配,**拒绝拨号**;每次拨号成功后自动学习更新指纹。
- **拨号双通道** — `rasphone -d` 首选(与手动点击连接同源、可静默),90 秒未建立会话则回退 `rasdial`。
- **失败退避防锁号** — 普通失败指数退避(15s 起步,上限 10 分钟);认证类失败(691/628)先 30 秒紧盯旧会话释放窗口,再转 15 分钟长退避。
- **开机自启** — 优先注册计划任务(登录即启动),失败自动回退为启动文件夹快捷方式;隐藏窗口启动、全程不弹窗。
- **图形管理界面** — WinForms 控制面板:红绿灯体检 + 一键修复,换机迁移时按清单逐项点亮绿灯即可,不懂命令行也能部署。
- **按天滚动日志** — `Logs\AutoDial-日期.log`,保留 30 天自动清理。

## 快速开始

```powershell
# 一键安装:绑定指纹 + 注册开机自启 + 启动守护(无需管理员权限)
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\AutoDial\Install-AutoDial.ps1"

# 换光猫 / 搬家后重新绑定链路指纹
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\AutoDial\AutoDial.ps1" -BindGateway

# 单轮检测(结果打印到控制台)与前台观察守护过程
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\AutoDial\AutoDial.ps1" -Once
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\AutoDial\AutoDial.ps1" -Console
```

普通用户推荐直接双击 **`打开管理界面.vbs`**,界面会自动体检并逐项提供修复按钮。

## 文件说明

| 文件 | 作用 |
|---|---|
| `AutoDial.ps1` | 主脚本(守护循环),内置默认配置,可被 `AutoDial.json` 覆盖 |
| `AutoDial.json` | 外置配置文件,换机适配只需修改此文件 |
| `AutoDial-Setup.ps1` | 图形管理界面(换机向导 / 控制面板) |
| `打开管理界面.vbs` | 管理界面的双击入口(无黑窗) |
| `gateway.mac` | 链路指纹文件(安装时自动生成) |
| `Start-AutoDial.vbs` | 隐藏窗口启动器(计划任务 / 启动项共用入口) |
| `Install-AutoDial.ps1` / `Uninstall-AutoDial.ps1` | 一键安装 / 卸载脚本 |
| `Logs\AutoDial-日期.log` | 按天滚动的运行日志(保留 30 天) |

## 技术栈

- **PowerShell 5.1** — Windows 11 系统自带,零第三方依赖,无需编译
- **系统内置能力** — `rasphone` / `rasdial` 拨号、`Get-NetAdapter` 网卡查询、计划任务自启
- **WinForms** — 图形管理界面(红绿灯体检 + 一键修复)
