// ==UserScript==
// @name         ddrk助手
// @namespace    king
// @version      0.4
// @description  1.去广告 2.收藏功能 3.历史观看记录 4.自动播放下一集
// @author       hero-king
// @match        https://ddrk.me/*
// @icon         https://ddrk.me/favicon-32x32.png
// @grant        unsafeWindow
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.js
// ==/UserScript==

(function () {
  "use strict";
  /*去广告*/
  $(".cfa_popup").css({ height: "0px" });
  $("#iaujwnefhw").css({ height: "0", overflow: "hidden" });
  $("#kasjbgih").css({ height: "0", overflow: "hidden" });

  const styleStr = `<style>
    .ddrk-tools__modal {
      position: absolute,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      text-align: right,
    }
    .btn_col-default {
      position: absolute;
      top:0;
      font-size:22px;
      color: #2EBF8B;
      padding:6px;
      background-color: rgba(0,0,0,0.4);
      box-shadow: 0px 0px 5px rgba(0,0,0,0.4);
      line-height: 1.2;
      user-select:none;
    }
    .col_list {
      position: fixed;
      top: 35px;
      right: 0;
      width: 0;
      height: auto;
      min-height: 54px;
      box-sizing: border-box;
      background: #000;
      box-shadow: -1px 1px 5px rgba(0, 0, 0, 0.2);
      z-index: 999;
      transition: width .6s;
    }
    .col_list .col_list_arrow{
      position: absolute;
      left: -26px;
      top: 0;
      width: 26px;
      padding: 4px;
      background: #008080;
      color: #000;
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
    }
    .col_list > h6{
      color: #aaa;
      margin: 10px 0 5px 0;
      text-align: center;
      white-space: nowrap;
    }

    .col_list-ul::-webkit-scrollbar {
      width: 5px;
      height: 5px
    }

    .col_list-ul::-webkit-scrollbar-thumb {
      border-radius: 3px;
      -moz-border-radius: 3px;
      -webkit-border-radius: 3px;
      background-color: #999;
    }

    .col_list-ul::-webkit-scrollbar-track {
      background-color: transparent
    }

    .col_list-ul {
      width: 300px;
      height: 300px;
      padding: 5px 0;
      overflow: hidden;
      color: #20B2AA;
    }

    .col_list-ul .col_item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      margin: 5px 0;
      padding: 0 5px;
      line-height: 25px;
      border: 1px solid transparent;
      border-left: none;
      border-right: none;
    }
    .col_list-ul .col_item .icon_del{
      border-radius: 100%;
      width: 16px;
      height: 16px;
      line-height: 1;
      display: none;
      text-align: center;
      color: #fff;
    }
    <style>`;
  $("head").append(styleStr);

  $(".post-box").on("click", ".btn_col-default", function (e) {
    e.stopPropagation();
  });
  $(".post-box").on("click", ".btn_col-add", function (e) {
    const href = $(this).parent().parent().data("href");
    const name = $(this).parent().parent().find(".post-box-title a").text();
    if (!colList.find((item) => item.href === href)) {
      colList.push({
        name: name.indexOf("(") > -1 ? name.split("(")[0] : name,
        href,
      });
      window.localStorage.setItem("ddrk-collection", JSON.stringify(colList));
    }
    reloadCollect(1, $(this));
    reloadColList();
  });
  $(".post-box").on("click", ".btn_col-remove", function (e) {
    const href = $(this).parent().parent().data("href");
    const index = colList.findIndex((item) => item.href === href);
    if (index !== -1) {
      colList.splice(index, 1);
      window.localStorage.setItem("ddrk-collection", JSON.stringify(colList));
    }
    reloadCollect(0, $(this));
    reloadColList();
  });
  $(".post-box").on("click", ".ddrk-tools__modal", function (e) {
    window.open($(this).parent().data("href"));
    e.stopPropagation();
  });
  $("body").on("click", ".col_list-ul li", function (e) {
    window.open($(this).data("href"));
    e.stopPropagation();
  });
  $("body").on("click", ".col_list-ul li .icon_del", function (e) {
    const href = $(this).parent().data("href");
    const index = colList.findIndex((item) => item.href === href);
    if (index !== -1) {
      colList.splice(index, 1);
      window.localStorage.setItem("ddrk-collection", JSON.stringify(colList));
    }
    reloadCollect();
    reloadColList();
    e.stopPropagation();
  });
  document.addEventListener("visibilitychange", function () {
    console.log("-----------", document.visibilityState);
    if (document.visibilityState == "hidden") {
      //切离该页面时执行
      // 标签隐藏时自动暂停播放（待开发）
    } else if (document.visibilityState == "visible") {
      //切换到该页面时执行
      initCollection();
      initHistory();
    }
  });

  /**
   * common
   */
  function createHtml(options = {}) {
    const colOuter = $("<div class='col_list'></div>");
    colOuter.css({
      top: options.top,
      "z-index": options["z-index"],
    });
    const title = $(`<h6>${options.title}</h6>`);
    const ul = $("<ul class='col_list-ul'></ul>");
    colOuter.append(title);
    colOuter.append(options.icon);
    colOuter.append(ul);
    $("body").append(colOuter);
    colOuter
      .mouseenter(function () {
        colOuter.css({ width: "300px" });
        ul.css({ overflow: "auto" });
      })
      .mouseleave(function () {
        colOuter.css({ width: "0" });
        ul.css({ overflow: "hidden" });
      });
    return ul;
  }

  /**
   * 蒙层及收藏按钮
   */
  const modal = $("<div  class='ddrk-tools__modal'></div>");
  const colButton = $('<span class="btn_col-default btn_col-remove">★</span>');
  $(".post-box").each(function () {
    const tempBtn = colButton.clone(true);
    if (!colList.find((item) => item.href === $(this).data("href"))) {
      tempBtn.addClass("btn_col-add");
      tempBtn.removeClass("btn_col-remove");
      tempBtn.text("☆");
    }
    modal.html(tempBtn);
    $(this).append(modal.clone(true));
  });
  function reloadCollect(tag, tempBtn) {
    if (tempBtn) {
      if (tag === 0) {
        tempBtn.addClass("btn_col-add");
        tempBtn.removeClass("btn_col-remove");
        tempBtn.text("☆");
      } else {
        tempBtn.addClass("btn_col-remove");
        tempBtn.removeClass("btn_col-add");
        tempBtn.text("★");
      }
    } else {
      $(".post-box").each(function () {
        const tempBtn = $(this).find(".btn_col-default");
        if (!colList.find((item) => item.href === $(this).data("href"))) {
          tempBtn.addClass("btn_col-add");
          tempBtn.removeClass("btn_col-remove");
          tempBtn.text("☆");
        } else {
          tempBtn.addClass("btn_col-remove");
          tempBtn.removeClass("btn_col-add");
          tempBtn.text("★");
        }
      });
    }
  }

  /**
   * 收藏列表
   */
  let colList = [];
  let colUl = null;
  function initCollection() {
    const jsonText = window.localStorage.getItem("ddrk-collection");
    if (jsonText) {
      colList = JSON.parse(jsonText);
    }
    const arrowIcon = $(
      '  <svg class="col_list_arrow" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" ><path fill="currentColor" d="M529.408 149.376a29.12 29.12 0 0 1 41.728 0 30.592 30.592 0 0 1 0 42.688L259.264 511.936l311.872 319.936a30.592 30.592 0 0 1-.512 43.264 29.12 29.12 0 0 1-41.216-.512L197.76 534.272a32 32 0 0 1 0-44.672l331.648-340.224zm256 0a29.12 29.12 0 0 1 41.728 0 30.592 30.592 0 0 1 0 42.688L515.264 511.936l311.872 319.936a30.592 30.592 0 0 1-.512 43.264 29.12 29.12 0 0 1-41.216-.512L453.76 534.272a32 32 0 0 1 0-44.672l331.648-340.224z"  ></path></svg>;'
    );
    const colIcon = $(
      '<svg class="col_list_arrow" t="1652086592663" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2982" width="32" height="32"><path d="M856.8 82.8H386.1c-40.4-43.2-135.5-67-188.9-67-94.9 0-175.8 70.5-188.9 164.4-5.6 16-8.3 31.3-8.3 46.7v603.7c0 98.7 80.3 179.2 179.2 179.2h695.7c82 0 148.8-66.7 148.8-148.8V249.8c0-92.2-74.8-167-166.9-167z m0 30.4c60 0 110.5 39.2 128.7 93.2H627.2l-183.5-93.2h413.1z m136.6 747.7c0 65.3-53.1 118.4-118.4 118.4H179.3c-82 0.1-148.9-66.7-148.9-148.8V226.8c0-12.3 2.3-24.7 7-38l0.8-3.2c10.5-79.4 78.7-139.5 159.1-139.5 56.2 0 142.9 26.7 170.1 61.2l4.6 5.8h2.6l242.3 120.3h374.9c0.6 5.3 1.6 10.6 1.6 16.1v611.4z m0 0" fill="#000000" p-id="2983"></path><path d="M201.3 842.6h791v27.8h-791v-27.8z m-92.9 0h30.3v30.3h-30.3v-30.3z m258-260L346.1 693.8c-1.9 10.7 2.3 21.3 11 27.8 8.8 6.5 20.1 7.4 29.8 2.5l98.7-51.6 99.5 53.6c4.3 2.3 8.9 3.4 13.5 3.4 5.7 0 11.5-1.8 16.4-5.3 8.8-6.3 13.3-16.8 11.6-27.6L608.1 586.8l81.8-78c7.8-7.5 10.7-18.6 7.5-29-3.3-10.4-12-17.8-22.7-19.5L564.5 444l-49-101.9c-4.7-9.8-14.4-15.9-25.2-16.1-9.7-0.5-20.7 5.8-25.6 15.5L415.1 441.1l-112 15.1c-10.7 1.5-19.6 8.8-23.1 19.1s-0.8 21.4 6.9 29.1l79.5 78.2z m52.8-111.3c9.2-1.2 17.2-6.9 21.5-15.3l49.2-97.2 47.2 98.3c4.1 8.4 12 14.3 21.2 15.7L666.1 489.6l-78.8 75.2c-6.7 6.4-9.9 15.7-8.4 25l18.5 108.3-97.3-52.3c-4.2-2.3-8.8-3.4-13.4-3.4-4.4 0-8.9 1-13 3.1l-97 49.7 19.6-107.3c1.7-9.2-1.3-18.6-7.9-25.1l-77.3-77 108.1-14.5z m0 0" fill="#000000" p-id="2984"></path></svg>'
    );
    colUl =
      colUl ||
      createHtml({
        top: "35px",
        "z-index": 999,
        title: "收藏夹",
        icon: colIcon,
      });
    reloadColList();
  }
  initCollection();
  function reloadColList() {
    colUl.html("");
    colList.forEach((item, index) => {
      const li = $("<li class='col_item'></li>");
      const span = $(`<span>${index + 1}. ${item.name}</span>`);
      const del = $("<span class='icon_del'>x</span>");
      li.append(span);
      li.append(del);
      li.data("href", item.href);
      li.mouseenter(function () {
        $(this).find(".icon_del").css({ display: "inline-block" });
        $(this).css({
          "box-shadow": "0 0 5px rgba(32,178,170,0.2)",
          "border-color": "rgba(225,255,255,0.4)",
        });
      }).mouseleave(function () {
        $(this).find(".icon_del").css({ display: "none" });
        $(this).css({ "box-shadow": "none", "border-color": "transparent" });
      });
      colUl.append(li);
    });
  }

  /**
   * 历史记录功能
   */
  let historyUl = null;
  async function initHistory() {
    const jsonText = window.localStorage.getItem("ddrk-history");
    let jsonList = [];
    if (jsonText) {
      jsonList = JSON.parse(jsonText);
    }

    const localData = getLocalStorageData();
    const his = formatLocalData(localData);
    const filterList = filterLocalData(his);
    let res = compareLocalData(jsonList, filterList);
    // console.log("history-----------------", his);
    for (const item of res) {
      if (!item.name) {
        const name = await getDramaName(item.url);
        item.name = name.indexOf("(") > -1 ? name.split("(")[0] : name;
      }
    }
    // 过滤name不存在的
    res = res.filter((item) => item.name);
    // console.log("result----------------", res);
    window.localStorage.setItem("ddrk-history", JSON.stringify(res));
    const arrowIcon = $(
      '  <svg class="col_list_arrow" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" ><path fill="currentColor" d="M529.408 149.376a29.12 29.12 0 0 1 41.728 0 30.592 30.592 0 0 1 0 42.688L259.264 511.936l311.872 319.936a30.592 30.592 0 0 1-.512 43.264 29.12 29.12 0 0 1-41.216-.512L197.76 534.272a32 32 0 0 1 0-44.672l331.648-340.224zm256 0a29.12 29.12 0 0 1 41.728 0 30.592 30.592 0 0 1 0 42.688L515.264 511.936l311.872 319.936a30.592 30.592 0 0 1-.512 43.264 29.12 29.12 0 0 1-41.216-.512L453.76 534.272a32 32 0 0 1 0-44.672l331.648-340.224z"  ></path></svg>;'
    );
    const hisIcon = $(
      '<svg class="col_list_arrow" t="1652086837248" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4653" width="32" height="32"><path d="M204.8 552.96h204.8a20.48 20.48 0 0 1 0 40.96H204.8a20.48 20.48 0 0 1 0-40.96z" p-id="4654" fill="#000000"></path><path d="M143.36 921.6a40.96 40.96 0 0 1-40.96-40.96V143.36a40.96 40.96 0 0 1 40.96-40.96h614.4a40.96 40.96 0 0 1 40.96 40.96v327.68h40.96V143.36a81.92 81.92 0 0 0-81.92-81.92H143.36a81.92 81.92 0 0 0-81.92 81.92v737.28a81.92 81.92 0 0 0 81.92 81.92h327.68v-40.96z" p-id="4655" fill="#000000"></path><path d="M737.28 512a225.28 225.28 0 1 0 225.28 225.28 225.28 225.28 0 0 0-225.28-225.28z m0 409.6a184.32 184.32 0 1 1 184.32-184.32 184.32 184.32 0 0 1-184.32 184.32z" p-id="4656" fill="#000000"></path><path d="M771.2768 660.6848Q634.88 584.0896 634.88 737.28t136.6016 76.5952q136.192-76.5952-0.2048-153.1904z m-13.5168 122.88Q675.84 829.44 675.84 737.28t81.92-46.08q81.92 46.08 0 92.16zM225.28 307.2h-20.48a20.48 20.48 0 0 0 0 40.96h20.48zM696.32 307.2H266.24v40.96h430.08a20.48 20.48 0 0 0 0-40.96z" p-id="4657" fill="#000000"></path></svg>'
    );
    historyUl =
      historyUl ||
      createHtml({
        top: "85px",
        "z-index": 98,
        title: "观看记录",
        icon: hisIcon,
      });
    reloadHistoryList(res);
  }
  initHistory();
  // 对比
  function compareLocalData(myList, ddrkList) {
    return ddrkList.map((ddrkItem) => {
      const innerItem =
        myList.find(
          (item) =>
            item.enName === ddrkItem.enName && item.season === ddrkItem.season
        ) || {};
      return {
        ...innerItem,
        ...ddrkItem,
      };
    });
  }
  // 格式化
  function formatLocalData(local) {
    const history = local
      .filter((item) => item.key.indexOf("videojs-resume:") === 0)
      .map((item) => {
        const info = item.key.split("/");
        return {
          ...item,
          url: item.key.split(":")[1],
          enName: info[1],
          season: info.length > 3 && !isNaN(info[2]) ? info[2] : "",
          ep: info.at(-1).replace("?ep=", ""),
        };
      });
    return history;
  }
  // 去重
  function filterLocalData(params) {
    const result = params.reduce((res, cur) => {
      const innerItem = res.find(
        (item) => item.enName === cur.enName && item.season === cur.season
      );
      if (innerItem) {
        if (+cur.ep > +innerItem.ep) {
          res.splice(
            res.findIndex(
              (item) => item.enName === cur.enName && item.season === cur.season
            ),
            1,
            cur
          );
        }
        return res;
      } else {
        return res.concat(cur);
      }
    }, []);
    return result;
  }
  function getLocalStorageData() {
    var len = localStorage.length; // 获取长度
    var arr = new Array(); // 定义数据集
    for (var i = 0; i < len; i++) {
      // 获取key 索引从0开始
      var getKey = localStorage.key(i);
      // 获取key对应的值
      var getVal = localStorage.getItem(getKey);
      // 放进数组
      arr[i] = {
        key: getKey,
        val: getVal,
      };
    }
    return arr;
  }
  function getDramaName(url) {
    return new Promise((resolve, reject) => {
      // $.get(`https://ddrk.me${url}`, function (result) {
      //   console.log(result);
      //   const name = $(result).find(".post-title").text();
      //   resolve(name);
      // }).error(function (XMLHttpRequest, textStatus, errorThrown) {
      //   console.log(XMLHttpRequest, textStatus, errorThrown);
      // });
      $.ajax({
        url: `https://ddrk.me${url}`,
        type: "get",
        success: function (result) {
          //成功后回调
          const name = $(result).find(".post-title").text();
          resolve(name);
        },
        error: function (e) {
          //失败后回调
          resolve("");
        },
      });
    });
  }
  function reloadHistoryList(hisList) {
    historyUl.html("");
    hisList.forEach((item, index) => {
      const li = $(
        "<li class='col_item' style='word-break: break-all;' ></li>"
      );
      const season = item.season ? `S${item.season}` : "";
      const ep = item.ep ? `E${item.ep}` : "";
      const hour =
        parseInt(item.val / 3600) > 0 ? parseInt(item.val / 3600) : 0;
      const min =
        parseInt((item.val - hour * 3600) / 60) > 0
          ? parseInt((item.val - hour * 3600) / 60)
          : 0;
      const sec = parseInt(item.val - hour * 3600 - min * 60);
      const timeStr = `${hour > 9 ? hour : "0" + hour}:${
        min > 9 ? min : "0" + min
      }:${sec > 9 ? sec : "0" + sec}`;
      const span = $(`<span>${index + 1}. ${item.name} ${season}${ep}</span>`);
      const span2 = $(
        `<span style='font-size: 12px;color: #fff;margin-left: 20px;white-space: nowrap;'>${timeStr}</span>`
      );
      //   const del = $("<span class='icon_del'>x</span>");
      //   li.append(del);
      li.append(span);
      li.append(span2);
      li.data("href", item.url);
      li.mouseenter(function () {
        $(this).css({
          "box-shadow": "0 0 5px rgba(32,178,170,0.2)",
          "border-color": "rgba(225,255,255,0.4)",
        });
        // $(this).find(".icon_del").css({ display: "inline-block" });
      }).mouseleave(function () {
        $(this).css({ "box-shadow": "none", "border-color": "transparent" });
        // $(this).find(".icon_del").css({ display: "none" });
      });
      historyUl.append(li);
    });
  }

  /**
   * 自动跳转并播放下一集
   */
  function handleNext(params) {
    window.videojs.getAllPlayers()[0].controlBar.children_[1].handleClick();
  }
})();