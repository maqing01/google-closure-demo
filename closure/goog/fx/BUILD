################################################################################
# Closure - Effects
# Copyright 2006 Google Inc.
# All Rights Reserved.
# Author: pupius@google.com (Daniel Pupius)
#
# This package contains classes for performing animations, and managing dragable
# elements.  dom.js contains a number of preset animations such as slide & fade.
#
################################################################################

package(default_visibility = ["//visibility:public"])

#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@
# All rules between these lines are generated by GenJsDeps, please do not edit.
# Use javascript/closure/genjsdeps.sh to update.

js_library(
    name = "all_js",
    srcs = [],
    deps = [
        "//javascript/closure/fx/anim:all_js",
        "//javascript/closure/fx/css3:all_js",
        ":abstractdragdrop",
        ":animation",
        ":animationqueue",
        ":cssspriteanimation",
        ":dom",
        ":dragdrop",
        ":dragdropgroup",
        ":dragger",
        ":draglistgroup",
        ":dragscrollsupport",
        ":easing",
        ":fx",
        ":transition",
        ":transitionbase",
    ],
)

js_library(
    name = "abstractdragdrop",
    srcs = ["abstractdragdrop.js"],
    deps = [
        "//javascript/closure/asserts",
        "//javascript/closure/dom:classlist",
        "//javascript/closure/dom",
        "//javascript/closure/events:event",
        "//javascript/closure/events:eventhandler",
        "//javascript/closure/events",
        "//javascript/closure/events:eventtarget",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/math:box",
        "//javascript/closure/math:coordinate",
        "//javascript/closure/style",
        "//javascript/closure:base",
        ":dragger",
    ],
)

js_library(
    name = "abstractdragdrop_test",
    testonly = 1,
    srcs = ["abstractdragdrop_test.js"],
    deps = [
        "//javascript/closure/array",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/functions",
        "//javascript/closure/math:box",
        "//javascript/closure/math:coordinate",
        "//javascript/closure/style",
        "//javascript/closure/testing/events",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure:base",
        ":abstractdragdrop",
    ],
)

js_library(
    name = "animation",
    srcs = ["animation.js"],
    deps = [
        "//javascript/closure/array",
        "//javascript/closure/events:event",
        "//javascript/closure/fx/anim",
        "//javascript/closure:base",
        ":transition",
        ":transitionbase",
    ],
)

js_library(
    name = "animation_test",
    testonly = 1,
    srcs = ["animation_test.js"],
    deps = [
        "//javascript/closure/events",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure/testing:mockclock",
        "//javascript/closure:base",
        ":animation",
    ],
)

js_library(
    name = "animationqueue",
    srcs = ["animationqueue.js"],
    deps = [
        "//javascript/closure/array",
        "//javascript/closure/asserts",
        "//javascript/closure/events:eventhandler",
        "//javascript/closure:base",
        ":transition",
        ":transitionbase",
    ],
)

js_library(
    name = "animationqueue_test",
    testonly = 1,
    srcs = ["animationqueue_test.js"],
    deps = [
        "//javascript/closure/events",
        "//javascript/closure/fx/anim",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure/testing:mockclock",
        "//javascript/closure:base",
        ":animation",
        ":animationqueue",
        ":transition",
    ],
)

js_library(
    name = "cssspriteanimation",
    srcs = ["cssspriteanimation.js"],
    deps = [
        "//javascript/closure:base",
        ":animation",
    ],
)

js_library(
    name = "cssspriteanimation_test",
    testonly = 1,
    srcs = ["cssspriteanimation_test.js"],
    deps = [
        "//javascript/closure/math:box",
        "//javascript/closure/math:size",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure/testing:mockclock",
        "//javascript/closure:base",
        ":cssspriteanimation",
    ],
)

js_library(
    name = "dom",
    srcs = ["dom.js"],
    deps = [
        "//javascript/closure/color",
        "//javascript/closure/events",
        "//javascript/closure/style:bidi",
        "//javascript/closure/style",
        "//javascript/closure:base",
        ":animation",
        ":transition",
    ],
)

js_library(
    name = "dragdrop",
    srcs = ["dragdrop.js"],
    deps = [
        "//javascript/closure:base",
        ":abstractdragdrop",
    ],
)

js_library(
    name = "dragdropgroup",
    srcs = ["dragdropgroup.js"],
    deps = [
        "//javascript/closure/dom",
        "//javascript/closure:base",
        ":abstractdragdrop",
    ],
)

js_library(
    name = "dragdropgroup_test",
    testonly = 1,
    srcs = ["dragdropgroup_test.js"],
    deps = [
        "//javascript/closure/events",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure:base",
        ":dragdropgroup",
    ],
)

js_library(
    name = "dragger",
    srcs = ["dragger.js"],
    deps = [
        "//javascript/closure/dom",
        "//javascript/closure/events:event",
        "//javascript/closure/events:eventhandler",
        "//javascript/closure/events",
        "//javascript/closure/events:eventtarget",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/math:coordinate",
        "//javascript/closure/math:rect",
        "//javascript/closure/style:bidi",
        "//javascript/closure/style",
        "//javascript/closure/useragent",
        "//javascript/closure:base",
    ],
)

js_library(
    name = "dragger_test",
    testonly = 1,
    srcs = ["dragger_test.js"],
    deps = [
        "//javascript/closure/dom",
        "//javascript/closure/events:browserevent",
        "//javascript/closure/events:event",
        "//javascript/closure/events",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/math:rect",
        "//javascript/closure/style:bidi",
        "//javascript/closure/testing/events",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure/testing:strictmock",
        "//javascript/closure/useragent",
        "//javascript/closure:base",
        ":dragger",
    ],
)

js_library(
    name = "draglistgroup",
    srcs = ["draglistgroup.js"],
    deps = [
        "//javascript/closure/array",
        "//javascript/closure/asserts",
        "//javascript/closure/dom:classlist",
        "//javascript/closure/dom",
        "//javascript/closure/events:event",
        "//javascript/closure/events:eventhandler",
        "//javascript/closure/events",
        "//javascript/closure/events:eventtarget",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/math:coordinate",
        "//javascript/closure/string",
        "//javascript/closure/style",
        "//javascript/closure:base",
        ":dragger",
    ],
)

js_library(
    name = "draglistgroup_test",
    testonly = 1,
    srcs = ["draglistgroup_test.js"],
    deps = [
        "//javascript/closure/array",
        "//javascript/closure/dom:classlist",
        "//javascript/closure/dom",
        "//javascript/closure/events:browserevent",
        "//javascript/closure/events:browserfeature",
        "//javascript/closure/events:event",
        "//javascript/closure/events",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/math:coordinate",
        "//javascript/closure/object",
        "//javascript/closure/testing/events",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure:base",
        ":dragger",
        ":draglistgroup",
    ],
)

js_library(
    name = "dragscrollsupport",
    srcs = ["dragscrollsupport.js"],
    deps = [
        "//javascript/closure/disposable",
        "//javascript/closure/dom",
        "//javascript/closure/events:eventhandler",
        "//javascript/closure/events:eventtype",
        "//javascript/closure/math:coordinate",
        "//javascript/closure/style",
        "//javascript/closure/timer",
        "//javascript/closure:base",
    ],
)

js_library(
    name = "dragscrollsupport_test",
    testonly = 1,
    srcs = ["dragscrollsupport_test.js"],
    deps = [
        "//javascript/closure/math:coordinate",
        "//javascript/closure/testing/events",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure/testing:mockclock",
        "//javascript/closure:base",
        ":dragscrollsupport",
    ],
)

js_library(
    name = "easing",
    srcs = ["easing.js"],
    deps = ["//javascript/closure:base"],
)

js_library(
    name = "easing_test",
    testonly = 1,
    srcs = ["easing_test.js"],
    deps = [
        "//javascript/closure/testing:jsunit",
        "//javascript/closure:base",
        ":easing",
    ],
)

js_library(
    name = "fx",
    srcs = ["fx.js"],
    deps = [
        "//javascript/closure/asserts",
        "//javascript/closure:base",
        ":animation",
        ":easing",
        ":transition",
    ],
)

js_library(
    name = "fx_test",
    testonly = 1,
    srcs = ["fx_test.js"],
    deps = [
        "//javascript/closure/object",
        "//javascript/closure/testing:jsunit",
        "//javascript/closure/testing:mockclock",
        "//javascript/closure/testing:propertyreplacer",
        "//javascript/closure:base",
        ":animation",
    ],
)

js_library(
    name = "test_files_deps",
    testonly = 1,
    srcs = [],
    data = ["//javascript/closure:base.js"],
    deps = [
        "//javascript/closure/fx:abstractdragdrop_test",
        "//javascript/closure/fx:animation_test",
        "//javascript/closure/fx:animationqueue_test",
        "//javascript/closure/fx:cssspriteanimation_test",
        "//javascript/closure/fx:dragdropgroup_test",
        "//javascript/closure/fx:dragger_test",
        "//javascript/closure/fx:draglistgroup_test",
        "//javascript/closure/fx:dragscrollsupport_test",
        "//javascript/closure/fx:easing_test",
        "//javascript/closure/fx:fx_test",
        "//javascript/closure:base",
    ],
)

js_deps(
    name = "test_js_deps",
    testonly = 1,
    srcs = [":test_files_deps"],
    merge_deps = 1,
)

js_library(
    name = "transition",
    srcs = ["transition.js"],
    deps = ["//javascript/closure:base"],
)

js_library(
    name = "transitionbase",
    srcs = ["transitionbase.js"],
    deps = [
        "//javascript/closure/events:eventtarget",
        "//javascript/closure:base",
        ":transition",
    ],
)

filegroup(
    name = "js_files",
    srcs = glob(["*.js"]),
)

filegroup(
    name = "js_files_recursive",
    srcs = [
        ":js_files",
        "//javascript/closure/fx/anim:js_files_recursive",
        "//javascript/closure/fx/css3:js_files_recursive",
    ],
)

filegroup(
    name = "test_files",
    srcs = glob([
        "*_test.html",
        "*_test.js",
        "*_test_dom.html",
    ]),
)

filegroup(
    name = "test_files_recursive",
    srcs = [
        ":test_files",
        "//javascript/closure/fx/anim:test_files_recursive",
        "//javascript/closure/fx/css3:test_files_recursive",
    ],
)

# All rules between these lines are generated by GenJsDeps, please do not edit.
# Use javascript/closure/genjsdeps.sh to update.
#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@
