goog.provide('hello');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dispose');

hello.sayHi = function () {
    var newHeader = goog.dom.createDom(goog.dom.TagName.H1, { style: 'background-color:#EEE' }, 'hello world');
    goog.dom.appendChild(document.body, newHeader);
}

hello.testDisPose = function () {
    var obj = {
        dispose() {
            console.log(123);
        },
    };
    goog.dispose(obj);
}

hello.testInherits = function () {
    function Person(name, age, gender) {
        this.name = name;
        this.age = age;
        this.gender = gender;
    }
    Person.prototype.showInfo = function () {
        console.log(this.name, this.age, this.gender);
    };

    function Student(name, age, gender, grade) {
        goog.base(this, name, age, gender);
        this.grade = grade;
    }
    goog.inherits(Student, Person);

    Student.prototype.showInfo = function () {
        goog.base(this, 'showInfo');
    };

    var s = new Student('张三', 12, '男', '六年级');
    s.showInfo();
}
