#!/bin/bash
#
# Converts input code from deprecated Matrix* naming to new Mat* naming.

cat - |
    sed -e s/Matrix4\\.setZero/Matrix4\\.makeZero/g |
    sed -e s/Matrix4\\.setIdentity/Matrix4\\.makeIdentity/g |
    sed -e s/Matrix4\\.add/Matrix4\\.addMat/g |
    sed -e s/Matrix4\\.subtract/Matrix4\\.subMat/g |
    sed -e s/Matrix4\\.scale/Matrix4\\.multScalar/g |
    sed -e s/Matrix4\\.lookAt/Matrix4\\.makeLookAt/g |
    sed -e s/Matrix4\\.makeAxisAngleRotate/Matrix4\\.makeRotate/g |
    sed -e s/Matrix4\\.fromEulerZXZ/Matrix4\\.makeEulerZXZ/g |
    sed -e s/Matrix4\\.applyTranslate/Matrix4\\.translate/g |
    sed -e s/Matrix4\\.applyScale/Matrix4\\.scale/g |
    sed -e s/Matrix4\\.applyRotate/Matrix4\\.rotate/g |
    sed -e s/goog\\.vec\\.Matrix4/goog\\.vec\\.Mat4/g |
    sed -e s/Matrix3\\.setZero/Matrix3\\.makeZero/g |
    sed -e s/Matrix3\\.setIdentity/Matrix3\\.makeIdentity/g |
    sed -e s/Matrix3\\.add/Matrix3\\.addMat/g |
    sed -e s/Matrix3\\.subtract/Matrix3\\.subMat/g |
    sed -e s/Matrix3\\.scale/Matrix3\\.multScalar/g |
    sed -e s/Matrix3\\.makeAxisAngleRotate/Matrix3\\.makeRotate/g |
    sed -e s/goog\\.vec\\.Matrix3/goog\\.vec\\.Mat3/g;
