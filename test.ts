// tests go here; this will not be compiled when this package is used as a library

// Setup: Left=M1/P0, Right=M3/P2, wheel dia=4.8cm, track=8.8cm, 270 ticks/rev
motorbit.setupRobot(
    motorbit.Motors.M1, DigitalPin.P0,
    motorbit.Motors.M3, DigitalPin.P2,
    4.8, 4.8, 8.8, 270
)

let testNum = 0
let gripTestNum = 0

// Press A → run next test in sequence
input.onButtonPressed(Button.A, function () {
    testNum += 1
    switch (testNum) {

        case 1:
            // เดินตรงไป 30 cm
            basic.showString("30F")
            motorbit.driveStraight(30, motorbit.DistanceUnit.CM, 150)
            basic.showIcon(IconNames.Yes)
            break

        case 2:
            // เดินตรงถอย 30 cm
            basic.showString("30B")
            motorbit.driveStraight(-30, motorbit.DistanceUnit.CM, 150)
            basic.showIcon(IconNames.Yes)
            break

        case 3:
            // เลี้ยวซ้าย 90°
            basic.showString("L90")
            motorbit.turnLeftForDegrees(90, 120)
            basic.showIcon(IconNames.Yes)
            break

        case 4:
            // เลี้ยวขวา 90°
            basic.showString("R90")
            motorbit.turnRightForDegrees(90, 120)
            basic.showIcon(IconNames.Yes)
            break

        case 5:
            // หันกลับ heading 0° (ทิศเริ่มต้น)
            basic.showString("H0")
            motorbit.headingToDegrees(0, 120)
            basic.showIcon(IconNames.Yes)
            break

        case 6:
            // สี่เหลี่ยม: เดิน 30cm + เลี้ยวขวา 90° × 4 รอบ
            basic.showString("SQ")
            for (let i = 0; i < 4; i++) {
                motorbit.driveStraight(30, motorbit.DistanceUnit.CM, 150)
                basic.pause(300)
                motorbit.turnRightForDegrees(90, 120)
                basic.pause(300)
            }
            basic.showIcon(IconNames.Yes)
            break

        default:
            // วนกลับต้น
            testNum = 0
            basic.showString("RST")
    }
})

// Press A+B → แสดง heading ปัจจุบัน
input.onButtonPressed(Button.AB, function () {
    basic.showNumber(motorbit.getDegrees())
})

// Press B → test gripper เปิด/ปิดจากองศาต่างๆ
// ต้องเรียก setupArm ก่อน (กด B ครั้งแรก)
input.onButtonPressed(Button.B, function () {
    gripTestNum += 1
    switch (gripTestNum) {

        case 1:
            // Setup arm: lift=S2, grip=S1
            basic.showString("GS")
            motorbit.setupArm(
                motorbit.Servos.S2, 30, 150,
                motorbit.Servos.S1, 30, 175
            )
            basic.showIcon(IconNames.Yes)
            break

        case 2:
            // ปิด gripper จาก open angle (current)
            basic.showString("GC")
            motorbit.closeGripper(-1)
            basic.showIcon(IconNames.Yes)
            break

        case 3:
            // เปิด gripper จาก close angle (current)
            basic.showString("GO")
            motorbit.openGripper(-1)
            basic.showIcon(IconNames.Yes)
            break

        case 4:
            // ปิดจาก 90° (mid) — fromAngle จัดการใน closeGripper
            basic.showString("M90C")
            motorbit.closeGripper(90)
            basic.showIcon(IconNames.Yes)
            break

        case 5:
            // เปิดจาก 90° (mid) — fromAngle จัดการใน openGripper
            basic.showString("M90O")
            motorbit.openGripper(90)
            basic.showIcon(IconNames.Yes)
            break

        case 6:
            // ปิดช้า speed=3 จาก open angle (current)
            basic.showString("SC3")
            motorbit.closeGripperWithSpeed(-1, 3)
            basic.showIcon(IconNames.Yes)
            break

        case 7:
            // เปิดช้า speed=3 จาก close angle (current)
            basic.showString("SO3")
            motorbit.openGripperWithSpeed(-1, 3)
            basic.showIcon(IconNames.Yes)
            break

        case 8:
            // moveGripperTo: ปัจจุบัน→90° speed 5
            basic.showString("T90")
            basic.showNumber(motorbit.getCurrentGripAngle())
            motorbit.moveGripperTo(90, 5)
            basic.showIcon(IconNames.Yes)
            break

        case 9:
            // moveGripperTo: 90°→150° speed 3 (ช้า)
            basic.showString("T150")
            basic.showNumber(motorbit.getCurrentGripAngle())
            motorbit.moveGripperTo(150, 3)
            basic.showIcon(IconNames.Yes)
            break

        case 10:
            // moveGripperTo: 150°→30° speed 8 (เร็ว)
            basic.showString("T30")
            basic.showNumber(motorbit.getCurrentGripAngle())
            motorbit.moveGripperTo(30, 8)
            basic.showIcon(IconNames.Yes)
            break

        default:
            gripTestNum = 0
            basic.showString("RST")
    }
})

basic.showString("RDY")
