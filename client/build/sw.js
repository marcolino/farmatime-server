/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-646121c5'], (function (workbox) { 'use strict';

  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "apple-touch-icon.png",
    "revision": "3186fc775e9ce36c2d17adc22dfe5b72"
  }, {
    "url": "assets/Avatar-BXQcgWnH.js",
    "revision": null
  }, {
    "url": "assets/Avatar-Ckep07s8.png",
    "revision": null
  }, {
    "url": "assets/CardContent-2iFtSbl9.js",
    "revision": null
  }, {
    "url": "assets/CardHeader-CC61v6Cu.js",
    "revision": null
  }, {
    "url": "assets/Cart-BfAhLjLg.js",
    "revision": null
  }, {
    "url": "assets/Checkbox-CkdH9MYB.js",
    "revision": null
  }, {
    "url": "assets/ConfirmationNumber-BSrK7wBB.js",
    "revision": null
  }, {
    "url": "assets/Contacts-CahYCCtQ.js",
    "revision": null
  }, {
    "url": "assets/Contacts-CIGW-MKW.css",
    "revision": null
  }, {
    "url": "assets/Divider-meZmmLuz.js",
    "revision": null
  }, {
    "url": "assets/Email-CcUa_Fla.js",
    "revision": null
  }, {
    "url": "assets/FlexyImageAndText-hpNqpemS.js",
    "revision": null
  }, {
    "url": "assets/ForgotPassword-BAFTWK2y.js",
    "revision": null
  }, {
    "url": "assets/Google-_uRkamXn.js",
    "revision": null
  }, {
    "url": "assets/Home-Bl_8wC1z.js",
    "revision": null
  }, {
    "url": "assets/Icon-GyIfsTeh.js",
    "revision": null
  }, {
    "url": "assets/ImageContainer-DuZqX4kn.js",
    "revision": null
  }, {
    "url": "assets/ImageNotFound-DqRiDcaH.jpg",
    "revision": null
  }, {
    "url": "assets/index-DQQjlUOR.js",
    "revision": null
  }, {
    "url": "assets/legal-DL88_J1s.js",
    "revision": null
  }, {
    "url": "assets/LogoMain-CFoVqyTr.png",
    "revision": null
  }, {
    "url": "assets/NotificationPreferences-DxhH8fP4.js",
    "revision": null
  }, {
    "url": "assets/Notifications-2ZHVRxWV.js",
    "revision": null
  }, {
    "url": "assets/PageNotFound-BXXMPGNC.js",
    "revision": null
  }, {
    "url": "assets/PageNotFound-DkXm7MIC.png",
    "revision": null
  }, {
    "url": "assets/Person-mecAAIfJ.js",
    "revision": null
  }, {
    "url": "assets/ProductEdit-DAdGFyJX.js",
    "revision": null
  }, {
    "url": "assets/Products-BzDp7wiy.js",
    "revision": null
  }, {
    "url": "assets/ProductsHandle-DvBh9AtA.js",
    "revision": null
  }, {
    "url": "assets/Select-B3vUW_kL.js",
    "revision": null
  }, {
    "url": "assets/Select-CM1JWUez.js",
    "revision": null
  }, {
    "url": "assets/SignIn-D4ZPsHRJ.js",
    "revision": null
  }, {
    "url": "assets/SignUp-CUUd44Bw.js",
    "revision": null
  }, {
    "url": "assets/SocialSignInError-ChuzKYNn.js",
    "revision": null
  }, {
    "url": "assets/SocialSignInSuccess-DTQEyj8p.js",
    "revision": null
  }, {
    "url": "assets/StackedArrows-XI6uOKUQ.js",
    "revision": null
  }, {
    "url": "assets/TextField-BTSCA2Mp.js",
    "revision": null
  }, {
    "url": "assets/TextFieldPassword-Bk00f6Vf.js",
    "revision": null
  }, {
    "url": "assets/TextFieldSearch-Y2Xxx-on.js",
    "revision": null
  }, {
    "url": "assets/UserEdit-yTqx6Qtl.js",
    "revision": null
  }, {
    "url": "assets/UsersHandle-CVtUmNFQ.js",
    "revision": null
  }, {
    "url": "assets/workbox-window.prod.es5-B9K5rw8f.js",
    "revision": null
  }, {
    "url": "assets/WorkInProgress--_hq_Pod.png",
    "revision": null
  }, {
    "url": "assets/WorkInProgress-h7tM-ltD.js",
    "revision": null
  }, {
    "url": "favicon-16x16.png",
    "revision": "55fb23b7aa2f2ae281703dd703e23244"
  }, {
    "url": "favicon-32x32.png",
    "revision": "4e770fcbc38200979870ab7f77f322bb"
  }, {
    "url": "favicon-64x64.png",
    "revision": "1dad9690207538438803acac3e6945a0"
  }, {
    "url": "favicon.ico",
    "revision": "f0b60161e743da5a4f23d38893b4fc06"
  }, {
    "url": "flags/ad.webp",
    "revision": "acd8e91af2422ae56284ea4127052878"
  }, {
    "url": "flags/ae.webp",
    "revision": "de2ab762d64429161ccace681b4b5cba"
  }, {
    "url": "flags/af.webp",
    "revision": "21416bf2e52517652c27d4a1f5cfcfc3"
  }, {
    "url": "flags/ag.webp",
    "revision": "14fd133b29b0035c3a551421edc2e2b9"
  }, {
    "url": "flags/ai.webp",
    "revision": "39ea8816b2cc33964a58cf4230dc945d"
  }, {
    "url": "flags/al.webp",
    "revision": "1ef006674ba89229f0b12f47e0757e61"
  }, {
    "url": "flags/am.webp",
    "revision": "bfe1e3d3f29a6b043fd38544586767b5"
  }, {
    "url": "flags/ao.webp",
    "revision": "ff19e42fc8f08b2bc2e63800c82372d1"
  }, {
    "url": "flags/aq.webp",
    "revision": "699f5a3053352feb1fd940cd575a705f"
  }, {
    "url": "flags/ar.webp",
    "revision": "529dac2d18f68f58e87dd916333b3406"
  }, {
    "url": "flags/as.webp",
    "revision": "b8fc64912258934b504e8e15f50229e7"
  }, {
    "url": "flags/at.webp",
    "revision": "3935e0f0176523091e195342196d4558"
  }, {
    "url": "flags/au.webp",
    "revision": "fb17e243af56f116c2566695fdf3516b"
  }, {
    "url": "flags/aw.webp",
    "revision": "e449d09c28c5430bab2ddca2ddb745f1"
  }, {
    "url": "flags/ax.webp",
    "revision": "e142d5cd36d8ede66a360800151804c5"
  }, {
    "url": "flags/az.webp",
    "revision": "1ae74ad97cfedf8494e5aaa471774d48"
  }, {
    "url": "flags/ba.webp",
    "revision": "b98db01721db36e0d7494b95aca1d35a"
  }, {
    "url": "flags/bb.webp",
    "revision": "7257ff5c9cf52ffee0693d5a067b3023"
  }, {
    "url": "flags/bd.webp",
    "revision": "feab95e0a7708d76cf2c71414fbd74cb"
  }, {
    "url": "flags/be.webp",
    "revision": "4ed0e300896c9fa67a7be082964998b7"
  }, {
    "url": "flags/bf.webp",
    "revision": "82d93748fcc00d73356611513b149cfb"
  }, {
    "url": "flags/bg.webp",
    "revision": "c0492b9d9542e0f3a677c54f19b7fa99"
  }, {
    "url": "flags/bh.webp",
    "revision": "099cbdf6a45d28bb843d9affb63efd9b"
  }, {
    "url": "flags/bi.webp",
    "revision": "e2af9c807bcce3e520ec1b7c518371df"
  }, {
    "url": "flags/bj.webp",
    "revision": "f529fc071b157cb9a9758c18f038311c"
  }, {
    "url": "flags/bl.webp",
    "revision": "7401354bd00d357bc78068a1f3f4e990"
  }, {
    "url": "flags/bm.webp",
    "revision": "d00d835c87108838b4f55d2fa2beaac9"
  }, {
    "url": "flags/bn.webp",
    "revision": "f77cc20bd485e0f6352dcdd71cc92f00"
  }, {
    "url": "flags/bo.webp",
    "revision": "2c53ac0657521b4bc6be0c6548bac501"
  }, {
    "url": "flags/bq.webp",
    "revision": "99f6e37af482581e4d2819481c3c363b"
  }, {
    "url": "flags/br.webp",
    "revision": "bd800387bb5e0873e1b40d34a464f96c"
  }, {
    "url": "flags/bs.webp",
    "revision": "cec0b5b7762da801a766dd52a5668ca8"
  }, {
    "url": "flags/bt.webp",
    "revision": "d43456c7cc18cf6e2cae0ad7116ed7a9"
  }, {
    "url": "flags/bv.webp",
    "revision": "1f6183b9cb9b9b834eb468126e773c84"
  }, {
    "url": "flags/bw.webp",
    "revision": "8d3b905a4fb358100e7d87aaf27cd6fe"
  }, {
    "url": "flags/by.webp",
    "revision": "83eec89b1a979f6d07088d12a0a177fe"
  }, {
    "url": "flags/bz.webp",
    "revision": "93a7501ce8134037d3286d6732a565a6"
  }, {
    "url": "flags/ca.webp",
    "revision": "d6acede8df4dc2ad6669f9463b67c8e5"
  }, {
    "url": "flags/cc.webp",
    "revision": "e03ca8dfd028a707479d3216dd4f76c4"
  }, {
    "url": "flags/cd.webp",
    "revision": "e471f5a66a9966b5c1055358e71c1a23"
  }, {
    "url": "flags/cf.webp",
    "revision": "a5a0ad68f762b032e990e3bfed90a3ca"
  }, {
    "url": "flags/cg.webp",
    "revision": "9951c0874d4f1f3ce4369b2b44d30af5"
  }, {
    "url": "flags/ch.webp",
    "revision": "d34d26bcfacec78d7843b7663b927d49"
  }, {
    "url": "flags/ci.webp",
    "revision": "0ae5763d991be3fea4397f541ef99437"
  }, {
    "url": "flags/ck.webp",
    "revision": "22115ed411a7226376701b12b68177db"
  }, {
    "url": "flags/cl.webp",
    "revision": "4796d1198cfa468709f48096407395b1"
  }, {
    "url": "flags/cm.webp",
    "revision": "e58604fb76140e524e4a7654ada6978e"
  }, {
    "url": "flags/cn.webp",
    "revision": "edd5906912426bf6df9df41ecc8c65f3"
  }, {
    "url": "flags/co.webp",
    "revision": "f0ddfcce6bcadbca058fe0566951ba3c"
  }, {
    "url": "flags/cr.webp",
    "revision": "069103c1cbb1404e614da2916e54be5b"
  }, {
    "url": "flags/cu.webp",
    "revision": "fdff35309479cc56f1902abcfda812f4"
  }, {
    "url": "flags/cv.webp",
    "revision": "415cd38e47ec6b6b1d6f3885b7b6cc8d"
  }, {
    "url": "flags/cw.webp",
    "revision": "4657f7e0ccfb81637ccef1d8e6bb8603"
  }, {
    "url": "flags/cx.webp",
    "revision": "3aefbf930c45d81886f6cef86d916b78"
  }, {
    "url": "flags/cy.webp",
    "revision": "18c68e9d4112f66b6a7f057f3e85653f"
  }, {
    "url": "flags/cz.webp",
    "revision": "517794644be311a5e45528c7d1b0af4a"
  }, {
    "url": "flags/de.webp",
    "revision": "f1e8018812c9067c7229f8b70b2eeb0d"
  }, {
    "url": "flags/dj.webp",
    "revision": "584aa381ce73a6ec173d9f9717e5f5b1"
  }, {
    "url": "flags/dk.webp",
    "revision": "d615d3316e2d0694b2886427c33dc790"
  }, {
    "url": "flags/dm.webp",
    "revision": "f843ff1197d4520071489ca05bd29abf"
  }, {
    "url": "flags/do.webp",
    "revision": "68afe069ab704d1e296cfe55cf387b14"
  }, {
    "url": "flags/dz.webp",
    "revision": "d55bd551fd0d3f8d192bf540c77041aa"
  }, {
    "url": "flags/ec.webp",
    "revision": "759142af6d74d788d8ffac2b311dad3b"
  }, {
    "url": "flags/ee.webp",
    "revision": "a51f5a698b8e45d353f3801aa62fef17"
  }, {
    "url": "flags/eg.webp",
    "revision": "21e82f7389c6a92efac45fa535d7976e"
  }, {
    "url": "flags/eh.webp",
    "revision": "7d6634ec29434437df1ea3165229675e"
  }, {
    "url": "flags/er.webp",
    "revision": "61ba24769f511fb370f90b673b33d62c"
  }, {
    "url": "flags/es.webp",
    "revision": "4ab2522d4b475dbeae9694968d53f29b"
  }, {
    "url": "flags/et.webp",
    "revision": "cd5d0e1aaf235500bf8a1380707317c1"
  }, {
    "url": "flags/fi.webp",
    "revision": "83522c5ac5ddbd810eda2bc44c0655c4"
  }, {
    "url": "flags/fj.webp",
    "revision": "f80f3957d7738c97c952e6514f53bbdb"
  }, {
    "url": "flags/fk.webp",
    "revision": "2776a250ec15664679ed9267f2de91bc"
  }, {
    "url": "flags/fm.webp",
    "revision": "87ab4901a3f54168833355ed7687dd5d"
  }, {
    "url": "flags/fo.webp",
    "revision": "8f2b9ebf762710b58b489b6131217ef5"
  }, {
    "url": "flags/fr.webp",
    "revision": "60158e98cfb3e0450c8f9cfac55e90c9"
  }, {
    "url": "flags/ga.webp",
    "revision": "2d6ac0232eba9b1355f1c64345f4c4d2"
  }, {
    "url": "flags/gb.webp",
    "revision": "80c7e5ca03be0edff82f19b2110002f3"
  }, {
    "url": "flags/gd.webp",
    "revision": "b09db6f8db22f18a72c0157b1771bca3"
  }, {
    "url": "flags/ge.webp",
    "revision": "ec35882644eee4089f2d0cce6bd08fc4"
  }, {
    "url": "flags/gf.webp",
    "revision": "6b1d7cff8ee16d3e7fb1f8c5d63d4e8b"
  }, {
    "url": "flags/gg.webp",
    "revision": "3e8456fd048c31e92a0e106b0dd66d94"
  }, {
    "url": "flags/gh.webp",
    "revision": "5b72ffee46c8486b165fb69cbe0738fe"
  }, {
    "url": "flags/gi.webp",
    "revision": "7d78bd2fe72f7c1339df2985d16372e2"
  }, {
    "url": "flags/gl.webp",
    "revision": "a61c1b7271a1af8d37e79900467bbd22"
  }, {
    "url": "flags/gm.webp",
    "revision": "b89484ec42a9fce09faa535b26d3d50a"
  }, {
    "url": "flags/gn.webp",
    "revision": "7d88c36ea2b0338d01f260427da8ccfd"
  }, {
    "url": "flags/gp.webp",
    "revision": "64fcc347cd4601aa907020572b2d672b"
  }, {
    "url": "flags/gq.webp",
    "revision": "a72a208618da14da7b8b77d8dc033c83"
  }, {
    "url": "flags/gr.webp",
    "revision": "bbc0e322b6ece4d0c8410ab4f6483ddd"
  }, {
    "url": "flags/gs.webp",
    "revision": "37ea3d2c9ffb45cb70d9a705363e7eb3"
  }, {
    "url": "flags/gt.webp",
    "revision": "9174b843a4f94a86de320c40b066bd3d"
  }, {
    "url": "flags/gu.webp",
    "revision": "73b0248a9bb941a09dc14fd82903b3cb"
  }, {
    "url": "flags/gw.webp",
    "revision": "f1f5ddc1543183965a0293a4e5f41c13"
  }, {
    "url": "flags/gy.webp",
    "revision": "8885296b9ee56b24488f421ad215b7f8"
  }, {
    "url": "flags/hk.webp",
    "revision": "ca915743c50f891ec46934cfa161ec6a"
  }, {
    "url": "flags/hm.webp",
    "revision": "34935bc11f1ebd9ccc3c7f340f10d727"
  }, {
    "url": "flags/hn.webp",
    "revision": "f936b3e0612f2a72244bcf75a63ff6b8"
  }, {
    "url": "flags/hr.webp",
    "revision": "2a5a110006f49099ecbc8a7283c86440"
  }, {
    "url": "flags/ht.webp",
    "revision": "c7b66e3eebd86adb878e3dc7a230618b"
  }, {
    "url": "flags/hu.webp",
    "revision": "c2dd5b6597167f40b48301861ab500a3"
  }, {
    "url": "flags/id.webp",
    "revision": "cf95cfe7be82178a8d54e746586538fa"
  }, {
    "url": "flags/ie.webp",
    "revision": "83150ca51d5a24db542a19320b2dbc92"
  }, {
    "url": "flags/il.webp",
    "revision": "75d0abfa647814f0ce38028957990bf1"
  }, {
    "url": "flags/im.webp",
    "revision": "c7f686c479908428ad5dfa2adfe7fe00"
  }, {
    "url": "flags/in.webp",
    "revision": "d9ae22bd2a9c2e57062c91eb3f08f152"
  }, {
    "url": "flags/io.webp",
    "revision": "174a699bc4866dcca007daaa2e839010"
  }, {
    "url": "flags/iq.webp",
    "revision": "d3f0fcbd8b4bae329303c8d7ac2752fc"
  }, {
    "url": "flags/ir.webp",
    "revision": "a62b51be59fddf25a76554ec48c22987"
  }, {
    "url": "flags/is.webp",
    "revision": "04f4374ce0d8276a8d449da7e3ae8307"
  }, {
    "url": "flags/it.webp",
    "revision": "2c76111c851a2cd98171b8654dd63207"
  }, {
    "url": "flags/je.webp",
    "revision": "919c3bdf8ff836dba6b9f67fe206cdcc"
  }, {
    "url": "flags/jm.webp",
    "revision": "95b09e5cbe281faf810e1c1bc328a1f9"
  }, {
    "url": "flags/jo.webp",
    "revision": "4fd692d096720154a5d5e20642f5bddc"
  }, {
    "url": "flags/jp.webp",
    "revision": "65309612cf48086cb43b91dfa5d011b2"
  }, {
    "url": "flags/ke.webp",
    "revision": "afb62b23149bc861054e58bdfaeb40ac"
  }, {
    "url": "flags/kg.webp",
    "revision": "91b34885a9f3a575e06a7c23ac96cb29"
  }, {
    "url": "flags/kh.webp",
    "revision": "fb9c33d8e56d8d6e563308c8747a2fa5"
  }, {
    "url": "flags/ki.webp",
    "revision": "1982c1d441b3edf5bc922682d06a9af3"
  }, {
    "url": "flags/km.webp",
    "revision": "38026634ec12e04ead7e46477ef4ec3a"
  }, {
    "url": "flags/kn.webp",
    "revision": "8483876a733e724103eda01afb1c098e"
  }, {
    "url": "flags/kp.webp",
    "revision": "2a79c55f81f4e15f03bcc2a1b8f6d418"
  }, {
    "url": "flags/kr.webp",
    "revision": "cdfa0017a3dbde872a96a7ded5405d78"
  }, {
    "url": "flags/kw.webp",
    "revision": "1bbfa156721b8a96874de8c3bd42ca14"
  }, {
    "url": "flags/ky.webp",
    "revision": "1ebf3d5b40f0abcf014fc782b66d61b3"
  }, {
    "url": "flags/kz.webp",
    "revision": "6419139534c1c4e0da4a696d3cff93e7"
  }, {
    "url": "flags/la.webp",
    "revision": "6be93e4e8fe3e33d2352001d40ce5b0f"
  }, {
    "url": "flags/lb.webp",
    "revision": "57f516af6d6179b045db44b0731daf90"
  }, {
    "url": "flags/lc.webp",
    "revision": "341d75a4e0d4b9984e4eb33a656b850c"
  }, {
    "url": "flags/li.webp",
    "revision": "464e7d56511bf159544d6af145dbc230"
  }, {
    "url": "flags/lk.webp",
    "revision": "7f148ac8c59ed627bd969780d5f5c7c1"
  }, {
    "url": "flags/lr.webp",
    "revision": "98d79620a6a14c9fb642bbb22d8813de"
  }, {
    "url": "flags/ls.webp",
    "revision": "72f68ab4757da6f5aef4633104daa81e"
  }, {
    "url": "flags/lt.webp",
    "revision": "124e8fe5944381815a86e3766fb0bf4b"
  }, {
    "url": "flags/lu.webp",
    "revision": "db946a2a7c46286d6d4412a24fb2f6f8"
  }, {
    "url": "flags/lv.webp",
    "revision": "c26eb8076250f1e8190b67bafd161494"
  }, {
    "url": "flags/ly.webp",
    "revision": "3d167187f7d01960d38b589f2d9bf27f"
  }, {
    "url": "flags/ma.webp",
    "revision": "972b1fdf95c69e36ef53c0ddc4c78430"
  }, {
    "url": "flags/mc.webp",
    "revision": "83ec2438ff2948e90cb7ed71332e69b5"
  }, {
    "url": "flags/md.webp",
    "revision": "a844409b7846c3fb5ae1d763fe7cbfc4"
  }, {
    "url": "flags/me.webp",
    "revision": "5f928a8253d881c29acade7942d7da86"
  }, {
    "url": "flags/mf.webp",
    "revision": "60158e98cfb3e0450c8f9cfac55e90c9"
  }, {
    "url": "flags/mg.webp",
    "revision": "74cb39a044246e354cee572f92cc66b9"
  }, {
    "url": "flags/mh.webp",
    "revision": "a296516ac0c3118a71655ba06e5f83c1"
  }, {
    "url": "flags/mk.webp",
    "revision": "6e805fef42aa065bda279fcb7ff84a79"
  }, {
    "url": "flags/ml.webp",
    "revision": "7751c9c96e26304cfeee62b55938c566"
  }, {
    "url": "flags/mm.webp",
    "revision": "db8f652cfabb2c8007a0ed242ce96062"
  }, {
    "url": "flags/mn.webp",
    "revision": "ee89c12843e9d5721831c3cfc2f7eb91"
  }, {
    "url": "flags/mo.webp",
    "revision": "61464e3a599ba844be96df93573ea5ba"
  }, {
    "url": "flags/mp.webp",
    "revision": "2762c1a1fcf42c32c75f6a290750d48c"
  }, {
    "url": "flags/mq.webp",
    "revision": "77829ca69cad2c4691aef884b0e056f9"
  }, {
    "url": "flags/mr.webp",
    "revision": "fa24639116319ac473e24cc5de0aa385"
  }, {
    "url": "flags/ms.webp",
    "revision": "046d1fedc598fee1e15d8ee630db7e44"
  }, {
    "url": "flags/mt.webp",
    "revision": "87881c477b89f673924d37dacd5daadc"
  }, {
    "url": "flags/mu.webp",
    "revision": "a682017caa335608927608b6db783845"
  }, {
    "url": "flags/mv.webp",
    "revision": "2efb3c68914637e40ce9f9134b40ecce"
  }, {
    "url": "flags/mw.webp",
    "revision": "8a29683bc2e24e2ae88a70b25df69994"
  }, {
    "url": "flags/mx.webp",
    "revision": "b705c987f8e99d75cce0d5c50bb574ad"
  }, {
    "url": "flags/my.webp",
    "revision": "9f692fc9af12aa233d6c568f2fb27a54"
  }, {
    "url": "flags/mz.webp",
    "revision": "a53241ae22fb0c4bc124bdd6dab8ebaa"
  }, {
    "url": "flags/na.webp",
    "revision": "82f9a068dc696d957d9862b47c8dc1b6"
  }, {
    "url": "flags/nc.webp",
    "revision": "45010415ad05bb79eef7438e3e715e91"
  }, {
    "url": "flags/ne.webp",
    "revision": "a8cb215c045f3f030c83442df2aabc98"
  }, {
    "url": "flags/nf.webp",
    "revision": "6c30fe13c0bcd841501ca1328dd94456"
  }, {
    "url": "flags/ng.webp",
    "revision": "1213ba2e6ee0325f5cb9789dda7669d2"
  }, {
    "url": "flags/ni.webp",
    "revision": "d22903054c073b2db48586845fe7dbbd"
  }, {
    "url": "flags/nl.webp",
    "revision": "f5e5f465d1521908e006eaf7c35389c6"
  }, {
    "url": "flags/no.webp",
    "revision": "1f6183b9cb9b9b834eb468126e773c84"
  }, {
    "url": "flags/np.webp",
    "revision": "dbc80a9a37c4c7c3c6d062166d27409c"
  }, {
    "url": "flags/nr.webp",
    "revision": "2f32b8b19eff05492d1ccc095bd6255b"
  }, {
    "url": "flags/nu.webp",
    "revision": "fb86fa6b3cd07733154854cdf942c30f"
  }, {
    "url": "flags/nz.webp",
    "revision": "e215722e8c55f14d2e3b5c244661624e"
  }, {
    "url": "flags/om.webp",
    "revision": "c431ff3130f4798c7cf233120b9e23c8"
  }, {
    "url": "flags/pa.webp",
    "revision": "f400b20ddee8e7a656160181bc113e21"
  }, {
    "url": "flags/pe.webp",
    "revision": "bc9ecbdca1bfb9418f3b6bdce204a4d8"
  }, {
    "url": "flags/pf.webp",
    "revision": "236cfea05563ec578fe22ab6661696aa"
  }, {
    "url": "flags/pg.webp",
    "revision": "5ccc2e361b28d7b9177e0674d1dddfa2"
  }, {
    "url": "flags/ph.webp",
    "revision": "b214416e2a9e1f73b493b30fd911fd73"
  }, {
    "url": "flags/pk.webp",
    "revision": "fe1d2af7204c433b2b0b876e22dff62b"
  }, {
    "url": "flags/pl.webp",
    "revision": "83547a6d35ef258b3cfe9a4ffe7bdba8"
  }, {
    "url": "flags/pm.webp",
    "revision": "89f07c0c5b87410aa45dfc7d183e7c2a"
  }, {
    "url": "flags/pn.webp",
    "revision": "5ed81c9eac4dc2a452f2b2bd8cc522a7"
  }, {
    "url": "flags/pr.webp",
    "revision": "3ee7214386556d8e64802bec477a688f"
  }, {
    "url": "flags/ps.webp",
    "revision": "d7ad13dff085b32df79ac3c4c02e1c58"
  }, {
    "url": "flags/pt.webp",
    "revision": "3c2e920ca9b0884a1e80e2b078e17f48"
  }, {
    "url": "flags/pw.webp",
    "revision": "6fe81701fb6f7374273087798f12ee33"
  }, {
    "url": "flags/py.webp",
    "revision": "07334e8e539b29f8d335d6c04136a0c6"
  }, {
    "url": "flags/qa.webp",
    "revision": "3ef952c345032ce7c930f38a49bf2176"
  }, {
    "url": "flags/re.webp",
    "revision": "47dc9fd60d4e21bfc0522fea8d20a2df"
  }, {
    "url": "flags/ro.webp",
    "revision": "fd421b9f6e441cd4343f605784a0f07d"
  }, {
    "url": "flags/rs.webp",
    "revision": "9107ffe25b147df8b0d5f747b7b79597"
  }, {
    "url": "flags/ru.webp",
    "revision": "7d3a7ff517e23ad361d689c6fea2de0b"
  }, {
    "url": "flags/rw.webp",
    "revision": "5bac22899f7344b03e0aa86f56f81aeb"
  }, {
    "url": "flags/sa.webp",
    "revision": "0daa1649cfeef9e9bcdea94a419e5881"
  }, {
    "url": "flags/sb.webp",
    "revision": "a5289feb4e4c8abaa2c156cf1bc872ba"
  }, {
    "url": "flags/sc.webp",
    "revision": "ddd2232a1327f49e971cc4806ba6c3f0"
  }, {
    "url": "flags/sd.webp",
    "revision": "46b728910f1662221cb2c5f81dbb2b9d"
  }, {
    "url": "flags/se.webp",
    "revision": "18ee16c07d41cdda9a1ae467e0d85283"
  }, {
    "url": "flags/sg.webp",
    "revision": "96e9051d51c3b7c5cd720fd868c7c68c"
  }, {
    "url": "flags/sh.webp",
    "revision": "511c9d0ce001b8a9411b3fb6929d6ebd"
  }, {
    "url": "flags/si.webp",
    "revision": "53ceeda472ac604569587f8ea1214f1c"
  }, {
    "url": "flags/sj.webp",
    "revision": "1f6183b9cb9b9b834eb468126e773c84"
  }, {
    "url": "flags/sk.webp",
    "revision": "17d564463eacb07120cd07f57f2b3512"
  }, {
    "url": "flags/sl.webp",
    "revision": "215de50d2c94cb847bfb50fb229f316a"
  }, {
    "url": "flags/sm.webp",
    "revision": "605c5a1973f6c56fa2b73917f01a9380"
  }, {
    "url": "flags/sn.webp",
    "revision": "93e3d7b47750c6ddc102f9dc11fb255a"
  }, {
    "url": "flags/so.webp",
    "revision": "bcf7b768789a714274bb5f30349fcd67"
  }, {
    "url": "flags/sr.webp",
    "revision": "8bd65837880689217f841544b44eb382"
  }, {
    "url": "flags/ss.webp",
    "revision": "9f292f58f64fcc686a361163f95878e8"
  }, {
    "url": "flags/st.webp",
    "revision": "980a65af72b98233f525b26224873c69"
  }, {
    "url": "flags/sv.webp",
    "revision": "37881d12e94b3ab5a12deb3b6b435357"
  }, {
    "url": "flags/sx.webp",
    "revision": "5d489db5c3cf80b576d09b63a4616e24"
  }, {
    "url": "flags/sy.webp",
    "revision": "0fbabdb64bc6d503702fbe0c974a940c"
  }, {
    "url": "flags/sz.webp",
    "revision": "3cbd409a359da4103d60d65a8a78680d"
  }, {
    "url": "flags/tc.webp",
    "revision": "88d1dc4d2f9f584f90c19da72f01cc8f"
  }, {
    "url": "flags/td.webp",
    "revision": "6d97401155d8d59df402f580afcf1d0a"
  }, {
    "url": "flags/tf.webp",
    "revision": "7e19837a5ccdeb99efe4d4bdf68b47c2"
  }, {
    "url": "flags/tg.webp",
    "revision": "e4789236b388c7593274fb4a5a8c4ceb"
  }, {
    "url": "flags/th.webp",
    "revision": "78f23a8c253a398a1ab040ab9c2e81bd"
  }, {
    "url": "flags/tj.webp",
    "revision": "2a032bd508af5b710d047fd3cf6bbf99"
  }, {
    "url": "flags/tk.webp",
    "revision": "b71416ec581cfa6f52e73d11eac57df3"
  }, {
    "url": "flags/tl.webp",
    "revision": "21d2bb81efac8a33af5105792501d822"
  }, {
    "url": "flags/tm.webp",
    "revision": "4615983d56878c7b967f0da7c7883341"
  }, {
    "url": "flags/tn.webp",
    "revision": "1521bd35bc80a47d8277d49d369a2029"
  }, {
    "url": "flags/to.webp",
    "revision": "2a72ec3b10063d0709686df62d893e1e"
  }, {
    "url": "flags/tr.webp",
    "revision": "e372b5bdf755384894d925eadbdf1af5"
  }, {
    "url": "flags/tt.webp",
    "revision": "c05985aad51cd7e3c1a9e42908e8dcfe"
  }, {
    "url": "flags/tv.webp",
    "revision": "196c3775a3d3f67fb14eded6c28bd786"
  }, {
    "url": "flags/tw.webp",
    "revision": "aeb489524a72ac26baeb1295e2b587d2"
  }, {
    "url": "flags/tz.webp",
    "revision": "9d936ad6b3adba31d7a4884de7e2751a"
  }, {
    "url": "flags/ua.webp",
    "revision": "804b26ce6f2cd991325b1eaacfc50b14"
  }, {
    "url": "flags/ug.webp",
    "revision": "9f6e5858280b5a367938b6809133f79e"
  }, {
    "url": "flags/um.webp",
    "revision": "5c4d7ef2ded5ffa40f06f7efdd0fc482"
  }, {
    "url": "flags/us.webp",
    "revision": "5c4d7ef2ded5ffa40f06f7efdd0fc482"
  }, {
    "url": "flags/uy.webp",
    "revision": "f6ac86ea390706ceab657e8d4b9ffa22"
  }, {
    "url": "flags/uz.webp",
    "revision": "9f1ad85374832690a08693bb83bc278b"
  }, {
    "url": "flags/va.webp",
    "revision": "7adc74e20928110b83f29ddcf4377b33"
  }, {
    "url": "flags/vc.webp",
    "revision": "c725bdf1c14ca30ec1ff1eee3506d065"
  }, {
    "url": "flags/ve.webp",
    "revision": "77d04dc3c6c7e02ad049acdca33165d4"
  }, {
    "url": "flags/vg.webp",
    "revision": "4375c4445129cccbf063d08844fc6346"
  }, {
    "url": "flags/vi.webp",
    "revision": "1abb5b06e76269f16ace62b6576c8d27"
  }, {
    "url": "flags/vn.webp",
    "revision": "a50dab5b57c829be39f8b0ff7e999509"
  }, {
    "url": "flags/vu.webp",
    "revision": "b53df058ccf674f8f268fcf0679e54ae"
  }, {
    "url": "flags/wf.webp",
    "revision": "fb7ca9550d08093fb72657d4739bc663"
  }, {
    "url": "flags/ws.webp",
    "revision": "0f8a2c9905de766b6d965f0baca121f0"
  }, {
    "url": "flags/ye.webp",
    "revision": "fb651980a024a1b95c92e0e3032bbb2a"
  }, {
    "url": "flags/yt.webp",
    "revision": "efcaeecc41e644ea3f6949fb48e82196"
  }, {
    "url": "flags/za.webp",
    "revision": "e8b22daaa23ebce1a0e8106cd798cf13"
  }, {
    "url": "flags/zm.webp",
    "revision": "3d271c0695ff317aa713324a8c9c34a2"
  }, {
    "url": "flags/zw.webp",
    "revision": "735479e6f252eaaa84111a1e8280aa21"
  }, {
    "url": "index.html",
    "revision": "aa936794104e4dba31e7eac3819aeaf9"
  }, {
    "url": "logo-email-header.png",
    "revision": "56cd4c1343a206717266f9a5b4d376da"
  }, {
    "url": "logo-main-header.png",
    "revision": "08fd148ce1a8c46bf2b08bec65ad0355"
  }, {
    "url": "manifest.webmanifest",
    "revision": "ba2e9be66ba7dbc6b5067126b49f0fbc"
  }, {
    "url": "ms-tile.png",
    "revision": "ab6b27636957d62e53a41ec1ebaa398d"
  }, {
    "url": "screenshot-narrow.png",
    "revision": "10037b1a4e109d641ca9b3092f2b9da2"
  }, {
    "url": "screenshot-wide.png",
    "revision": "6fea726337917906a34712c38e8bc33b"
  }, {
    "url": "videos/clouds.mp4",
    "revision": "227f3d3fed9c8a5d33c218365de8c6b2"
  }, {
    "url": "videos/country.mp4",
    "revision": "289b80d6c85dae2c3e31dcb2d3763c05"
  }, {
    "url": "videos/factory.mp4",
    "revision": "58ac0934e514027320a7ea61b5bca40d"
  }, {
    "url": "videos/lake.mp4",
    "revision": "65f8644b4f9409f7f0a2f022785204ab"
  }, {
    "url": "videos/shoreline.mp4",
    "revision": "5f8ee1e1b2f1e9a7a3d3c0d9b38a4b77"
  }, {
    "url": "videos/sky.mp4",
    "revision": "c5e712c65bb2e71ed981b7b171086c50"
  }, {
    "url": "videos/steam.mp4",
    "revision": "01fbf352b2eb91156f5c0f5217e3e94b"
  }, {
    "url": "videos/wave.mp4",
    "revision": "45cae5ea9906b7a76b6fea18293c7fbc"
  }, {
    "url": "videos/wind-turbines.mp4",
    "revision": "35f91409d654f4e346603d99a1495025"
  }, {
    "url": "build-info.json",
    "revision": "3eeb40a659554327fd1addd0742e2bc7"
  }, {
    "url": "manifest.webmanifest",
    "revision": "ba2e9be66ba7dbc6b5067126b49f0fbc"
  }, {
    "url": "ms-tile.png",
    "revision": "ab6b27636957d62e53a41ec1ebaa398d"
  }, {
    "url": "robots.txt",
    "revision": "e93435e08581859792b4ef3f6bd5f8fe"
  }, {
    "url": "screenshot-narrow.png",
    "revision": "10037b1a4e109d641ca9b3092f2b9da2"
  }, {
    "url": "screenshot-wide.png",
    "revision": "6fea726337917906a34712c38e8bc33b"
  }, {
    "url": "sitemap.xml",
    "revision": "9d644c5ae87f6496d5d400d1552d9aae"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//, /^\/auth\//, /^\/static\//]
  }));
  workbox.registerRoute(({
    request
  }) => request.destination === "document", new workbox.NetworkFirst({
    "cacheName": "document-assets-cache",
    plugins: [new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    request
  }) => ["style", "script", "image"].includes(request.destination), new workbox.NetworkFirst({
    "cacheName": "style-script-image-assets-cache",
    plugins: [new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    request
  }) => ["font"].includes(request.destination), new workbox.CacheFirst({
    "cacheName": "font-assets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 3,
      maxAgeSeconds: 15552000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    request
  }) => ["audio", "video"].includes(request.destination), new workbox.CacheFirst({
    "cacheName": "audio-video-assets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 15552000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/flagcdn\.com\/.*$/, new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*           /, new workbox.StaleWhileRevalidate({
    "cacheName": "google-fonts-stylesheets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*             /, new workbox.CacheFirst({
    "cacheName": "google-fonts-webfonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 1,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^http:\/\/localhost:5000\/.*$/, new workbox.NetworkFirst({
    "cacheName": "local-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/acme-server-lingering-brook-4120\.fly\.dev\/api\/.*$/, new workbox.NetworkFirst({
    "cacheName": "public-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');

}));
