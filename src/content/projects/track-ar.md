---
title: Track-AR 田径赛道实时 AR 叠加系统
description: Real-time AR overlay system for track & field video broadcasting | 田径赛道实时 AR 增强现实叠加系统
pubDate: 2026-07-15
tags:
  - Python
  - AR
  - 视频处理
featured: true
githubUrl: https://github.com/Je-qljx/Track-AR
order: 2
---

## 项目简介

田径赛事转播中，赛道信息、运动员名次与成绩等数据通常需要人工叠加，成本高且易出错。Track-AR 是一套面向田径赛道视频的实时 AR 增强现实叠加系统，通过计算机视觉对赛道进行识别与跟踪，将动态数据实时叠加到视频画面上，提升转播的信息密度与观赏性。

## 功能特性

- 实时识别并跟踪田径赛道区域，稳定叠加 AR 元素
- 支持将运动员名次、成绩等动态数据渲染到视频画面
- 面向视频流的实时处理管线，兼顾准确性与帧率
- 模块化设计，便于接入不同赛事数据源

## 技术栈

- Python 实现核心视觉与处理逻辑
- 基于 OpenCV 完成赛道检测、跟踪与图像处理
- 视频流处理与 AR 渲染管线

## 使用方式

按仓库说明安装依赖后，输入赛事视频与对应数据，即可输出带 AR 叠加的转播画面。
