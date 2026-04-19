// tests go here; this will not be compiled when this package is used as a library

motorbit.setupRobot(
    motorbit.Motors.M4, DigitalPin.P0,
    motorbit.Motors.M3, DigitalPin.P2,
    4.7, 4.7, 8.8, 270
)

let testNum = 0

// Press A → headingToDegrees test sequence
// แต่ละ case แสดง heading ก่อน → หมุน → แสดง heading หลัง
// input.onButtonPressed(Button.A, function () {
//     testNum += 1
//     switch (testNum) {

//         case 1:
//             // หัน → 90°
//             basic.showString("H90")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(90, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 2:
//             // หัน → 180°
//             basic.showString("H180")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(180, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 3:
//             // หัน → 270°
//             basic.showString("H270")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(270, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 4:
//             // หันกลับ → 0°
//             basic.showString("H0")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(0, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 5:
//             // หัน → 45°
//             basic.showString("H45")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(45, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 6:
//             // หัน → 135°
//             basic.showString("H135")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(135, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 7:
//             // หัน → 225°
//             basic.showString("H225")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(225, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         case 8:
//             // หัน → 315°
//             basic.showString("H315")
//             basic.showNumber(motorbit.getDegrees())
//             motorbit.headingToDegrees(315, 100)
//             basic.showNumber(motorbit.getDegrees())
//             basic.showIcon(IconNames.Yes)
//             break

//         default:
//             testNum = 0
//             basic.showString("RST")
//     }
// })

// // Press A+B → แสดง heading ปัจจุบัน
// input.onButtonPressed(Button.AB, function () {
//     basic.showNumber(motorbit.getDegrees())
// })

// // Press B → reset heading counter (ไม่ reset BNO055 zero)
// input.onButtonPressed(Button.B, function () {
//     //motorbit.driveStraight(30,motorbit.DistanceUnit.CM,150)
//     //motorbit.MotorRun(motorbit.Motors.M3,100)
// })

//basic.forever(function () {
    //motorbit.debugTicks()
    //basic.pause(200)
//})



input.onButtonPressed(Button.A, function () {

    basic.showNumber(motorbit.getCalibrationStatus())
})
input.onButtonPressed(Button.B, function () {
    
})
input.onButtonPressed(Button.AB, function () {
    motorbit.initBNO055()
})
basic.showString("RDY")

