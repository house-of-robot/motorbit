/*
modified from pxt-servo/servodriver.ts
load dependency
"motorbit": "file:../pxt-motorbit"
*/
enum Offset {
    //% block=one
    ONE = 0,
    //% block=two
    TWO = 1,
    //% block=three
    THREE = 2,
    //% block=four
    FOUR = 3
}

//% color="#EE6A50" weight=10 icon="\uf0d1"
//% groups=['Gorilla Go', 'Motor', 'Servo', 'GeekServo', 'Stepper Motor', 'RUS-04', 'RGB']
namespace motorbit {

    // ── PCA9685 constants ─────────────────────────────────────────────────────────
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095
    const STP_CHB_L = 1
    const STP_CHB_H = 2047
    const STP_CHC_L = 1023
    const STP_CHC_H = 3071
    const STP_CHD_L = 3071
    const STP_CHD_H = 1023

    // ── BNO055 constants ──────────────────────────────────────────────────────────
    const BNO055_ADDR = 0x28
    const BNO055_OPR_MODE_REG = 0x3D
    const BNO055_EUL_H_LSB = 0x1A

    // ── Enums ─────────────────────────────────────────────────────────────────────
    export enum Servos {
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        S4 = 0x04,
        S5 = 0x05,
        S6 = 0x06,
        S7 = 0x07,
        S8 = 0x08
    }

    export enum Motors {
        M1 = 0x1,
        M2 = 0x2,
        M3 = 0x3,
        M4 = 0x4
    }

    export enum Steppers {
        STPM1_2 = 0x2,
        STPM3_4 = 0x1
    }

    export enum SonarVersion {
        V1 = 0x1,
        V2 = 0x2
    }

    export enum Turns {
        //% blockId="T1B4" block="1/4"
        T1B4 = 90,
        //% blockId="T1B2" block="1/2"
        T1B2 = 180,
        //% blockId="T1B0" block="1"
        T1B0 = 360,
        //% blockId="T2B0" block="2"
        T2B0 = 720,
        //% blockId="T3B0" block="3"
        T3B0 = 1080,
        //% blockId="T4B0" block="4"
        T4B0 = 1440,
        //% blockId="T5B0" block="5"
        T5B0 = 1800
    }

    export enum DistanceUnit {
        //% block="cm"
        CM = 0,
        //% block="inch"
        Inch = 1
    }

    // ── State variables ───────────────────────────────────────────────────────────
    let initialized = false
    let matBuf = pins.createBuffer(17);
    let distanceBuf = 0;

    let gg_leftMotor: Motors = Motors.M4
    let gg_rightMotor: Motors = Motors.M3
    let gg_leftWheelDia: number = 4.8
    let gg_rightWheelDia: number = 4.8
    let gg_trackWidth: number = 8.8
    let gg_ticksPerRev: number = 270
    let gg_leftTicks: number = 0
    let gg_rightTicks: number = 0
    let gg_leftMotorDir: number = -1
    let gg_rightMotorDir: number = 1
    let gg_liftServo: Servos = Servos.S2
    let gg_liftDownAngle: number = 30
    let gg_liftUpAngle: number = 150
    let gg_gripServo: Servos = Servos.S1
    let gg_gripOpenAngle: number = 30
    let gg_gripCloseAngle: number = 175
    let gg_currentGripAngle: number = 30
    let gg_zeroHeading: number = 0

    // ── Private helpers ───────────────────────────────────────────────────────────
    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2ccmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50);
        for (let idx = 0; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;
        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }

    function setStepper(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(0, STP_CHA_L, STP_CHA_H);
                setPwm(2, STP_CHB_L, STP_CHB_H);
                setPwm(1, STP_CHC_L, STP_CHC_H);
                setPwm(3, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(3, STP_CHA_L, STP_CHA_H);
                setPwm(1, STP_CHB_L, STP_CHB_H);
                setPwm(2, STP_CHC_L, STP_CHC_H);
                setPwm(0, STP_CHD_L, STP_CHD_H);
            }
        } else {
            if (dir) {
                setPwm(4, STP_CHA_L, STP_CHA_H);
                setPwm(6, STP_CHB_L, STP_CHB_H);
                setPwm(5, STP_CHC_L, STP_CHC_H);
                setPwm(7, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(7, STP_CHA_L, STP_CHA_H);
                setPwm(5, STP_CHB_L, STP_CHB_H);
                setPwm(6, STP_CHC_L, STP_CHC_H);
                setPwm(4, STP_CHD_L, STP_CHD_H);
            }
        }
    }

    function stopMotor(index: number) {
        setPwm((index - 1) * 2, 0, 0);
        setPwm((index - 1) * 2 + 1, 0, 0);
    }

    function initBNO055(): void {
        i2cwrite(BNO055_ADDR, BNO055_OPR_MODE_REG, 0x00)
        basic.pause(25)
        // NDOF fusion mode — takes ~700 ms to stabilise
        i2cwrite(BNO055_ADDR, BNO055_OPR_MODE_REG, 0x0C)
        basic.pause(700)
    }

    function bno055Heading(): number {
        let lsb = i2cread(BNO055_ADDR, BNO055_EUL_H_LSB)
        let msb = i2cread(BNO055_ADDR, BNO055_EUL_H_LSB + 1)
        return ((lsb | (msb << 8)) & 0xFFFF) / 16
    }

    function ggRawHeading(): number {
        return (bno055Heading() - gg_zeroHeading + 360) % 360
    }

    function ggHeadingDiff(target: number, current: number): number {
        let d = target - current
        if (d > 180) d -= 360
        if (d < -180) d += 360
        return d
    }

    function setGripperAngle(angle: number): void {
        Servo(gg_gripServo, angle)
        gg_currentGripAngle = angle
    }

    function driveLeft(speed: number): void {
        MotorRun(gg_leftMotor, gg_leftMotorDir * speed)
    }

    function driveRight(speed: number): void {
        MotorRun(gg_rightMotor, gg_rightMotorDir * speed)
    }

    // ── Gorilla Go ────────────────────────────────────────────────────────────────

    /**
     * Set up the robot for MotorBit V2.0.
     * Specify left/right motors, encoder pins, wheel sizes, and track width.
     * Call once in "on start".
     * @param leftMotor left drive motor; eg: motorbit.Motors.M1
     * @param leftPin left encoder pin; eg: DigitalPin.P13
     * @param rightMotor right drive motor; eg: motorbit.Motors.M3
     * @param rightPin right encoder pin; eg: DigitalPin.P14
     */
    //% blockId=motorbit_setup_robot
    //% block="Setup Robot|Left Motor %leftMotor Encoder %leftPin|Right Motor %rightMotor Encoder %rightPin|Wheel Dia L (cm) %leftWheelDia R (cm) %rightWheelDia|Track Width (cm) %trackWidth Ticks/Rev %ticksPerRev"
    //% group="Gorilla Go"
    //% weight=100
    //% leftMotor.defl=motorbit.Motors.M4
    //% leftPin.defl=DigitalPin.P2
    //% rightMotor.defl=motorbit.Motors.M3
    //% rightPin.defl=DigitalPin.P0
    //% leftWheelDia.defl=4.8
    //% rightWheelDia.defl=4.8
    //% trackWidth.defl=8.8
    //% ticksPerRev.defl=270
    //% inlineInputMode=external
    export function setupRobot(
        leftMotor: Motors, leftPin: DigitalPin,
        rightMotor: Motors, rightPin: DigitalPin,
        leftWheelDia: number, rightWheelDia: number,
        trackWidth: number, ticksPerRev: number
    ): void {
        if (!initialized) initPCA9685()
        gg_leftMotor = leftMotor
        gg_rightMotor = rightMotor
        gg_leftWheelDia = leftWheelDia
        gg_rightWheelDia = rightWheelDia
        gg_trackWidth = trackWidth
        gg_ticksPerRev = ticksPerRev
        gg_leftTicks = 0
        gg_rightTicks = 0
        pins.onPulsed(leftPin, PulseValue.High, function () { gg_leftTicks += 1 })
        pins.onPulsed(rightPin, PulseValue.High, function () { gg_rightTicks += 1 })
        initBNO055()
        gg_zeroHeading = bno055Heading()
    }

    /**
     * Set up the arm and gripper servos.
     * Specify which servos to use and their angles.
     * @param liftServo servo for raising/lowering the arm; eg: motorbit.Servos.S1
     * @param liftDownAngle arm angle when lowered (pick position); eg: 30
     * @param liftUpAngle arm angle when raised (carry position); eg: 150
     * @param gripServo servo for the gripper; eg: motorbit.Servos.S2
     * @param gripOpenAngle gripper open angle; eg: 30
     * @param gripCloseAngle gripper close angle (gripping); eg: 110
     */
    //% blockId=motorbit_setup_arm
    //% block="Setup Arm|Lift Servo %liftServo down %liftDownAngle° up %liftUpAngle°|Grip Servo %gripServo open %gripOpenAngle° close %gripCloseAngle°"
    //% group="Gorilla Go"
    //% weight=99
    //% liftServo.defl=motorbit.Servos.S2
    //% gripServo.defl=motorbit.Servos.S1
    //% liftDownAngle.min=0 liftDownAngle.max=180 liftDownAngle.defl=30
    //% liftUpAngle.min=0 liftUpAngle.max=180 liftUpAngle.defl=150
    //% gripOpenAngle.min=0 gripOpenAngle.max=180 gripOpenAngle.defl=30
    //% gripCloseAngle.min=0 gripCloseAngle.max=180 gripCloseAngle.defl=175
    //% inlineInputMode=external
    export function setupArm(
        liftServo: Servos, liftDownAngle: number, liftUpAngle: number,
        gripServo: Servos, gripOpenAngle: number, gripCloseAngle: number
    ): void {
        gg_liftServo = liftServo
        gg_liftDownAngle = liftDownAngle
        gg_liftUpAngle = liftUpAngle
        gg_gripServo = gripServo
        gg_gripOpenAngle = gripOpenAngle
        gg_gripCloseAngle = gripCloseAngle
        gg_currentGripAngle = gripOpenAngle
    }
    
//% blockId=motorbit_reset_yaw
    //% block="Reset Yaw to 0"
    //% group="Gorilla Go"
    //% weight=92
    export function resetYaw(): void {
        gg_zeroHeading = bno055Heading()
    }

    /**
     * Turn left by a relative angle using tank mode (both wheels move).
     * @param degrees how many degrees to turn left; eg: 90
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_turn_left_for
    //% block="Turn Left %degrees ° speed %speed"
    //% group="Gorilla Go" weight=98
    //% degrees.min=0 degrees.max=360 degrees.defl=90
    //% speed.min=0 speed.max=255 speed.defl=100
    //% inlineInputMode=inline
    export function turnLeftForDegrees(degrees: number, speed: number): void {
        let target = (getDegrees() - degrees + 360) % 360
        headingToDegrees(target, speed)
    }

    /**
     * Turn right by a relative angle using tank mode (both wheels move).
     * @param degrees how many degrees to turn right; eg: 90
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_turn_right_for
    //% block="Turn Right %degrees ° speed %speed"
    //% group="Gorilla Go" weight=97
    //% degrees.min=0 degrees.max=360 degrees.defl=90
    //% speed.min=0 speed.max=255 speed.defl=100
    //% inlineInputMode=inline
    export function turnRightForDegrees(degrees: number, speed: number): void {
        let target = (getDegrees() + degrees) % 360
        headingToDegrees(target, speed)
    }

    /**
     * Turn to face an absolute heading using tank mode (0-360, relative to zero set).
     * @param heading target heading 0-360; eg: 0
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_heading_to
    //% block="Heading To %heading ° speed %speed"
    //% group="Gorilla Go" weight=96
    //% heading.min=0 heading.max=360 heading.defl=0
    //% speed.min=0 speed.max=255 speed.defl=100
    //% inlineInputMode=inline
    export function headingToDegrees(heading: number, speed: number): void {
        if (!initialized) initPCA9685()
        let prevHeading = getDegrees()
        let noChangeMs = 0
        let lastSign = 0

        // Phase 1: coarse — ramp down from full speed starting at 120° out, exit at 40°
        while (true) {
            let diff = ggHeadingDiff(heading, getDegrees())
            if (Math.abs(diff) <= 40) break
            let turnSpeed = Math.abs(diff) < 120
                ? Math.max(55, Math.round(speed * Math.abs(diff) / 120))
                : speed
            let curSign = diff > 0 ? 1 : -1
            if (lastSign != 0 && curSign != lastSign) {
                MotorStop(gg_leftMotor)
                MotorStop(gg_rightMotor)
                basic.pause(200)
                noChangeMs = 0
            }
            lastSign = curSign
            if (diff > 0) {
                driveLeft(turnSpeed)
                driveRight(-turnSpeed)
            } else {
                driveLeft(-turnSpeed)
                driveRight(turnSpeed)
            }
            basic.pause(20)
            let curHeading = getDegrees()
            if (Math.abs(ggHeadingDiff(curHeading, prevHeading)) < 1) {
                noChangeMs += 20
            } else {
                noChangeMs = 0
            }
            prevHeading = curHeading
            if (noChangeMs >= 400 && Math.abs(diff) > 50) {
                if (diff > 0) {
                    driveLeft(255)
                    driveRight(-255)
                } else {
                    driveLeft(-255)
                    driveRight(255)
                }
                basic.pause(150)
                noChangeMs = 0
            }
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
        basic.pause(300)

        // Phase 2: mid — slow continuous drive until within 10°
        while (true) {
            let diff = ggHeadingDiff(heading, getDegrees())
            if (Math.abs(diff) <= 10) break
            if (diff > 0) {
                driveLeft(65)
                driveRight(-65)
            } else {
                driveLeft(-65)
                driveRight(65)
            }
            basic.pause(20)
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
        basic.pause(400)

        // Phase 3: fine — short pulses, max 8 attempts or 2000ms, 0.5° resolution
        let fineStart = input.runningTime()
        for (let i = 0; i < 8; i++) {
            if (input.runningTime() - fineStart > 2000) break
            let diff = ggHeadingDiff(heading, ggRawHeading())
            if (Math.abs(diff) <= 0.5) break
            if (diff > 0) {
                driveLeft(90)
                driveRight(-90)
            } else {
                driveLeft(-90)
                driveRight(90)
            }
            basic.pause(25)
            MotorStop(gg_leftMotor)
            MotorStop(gg_rightMotor)
            basic.pause(200)
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
    }

    /**
     * Rotate to face an absolute heading using pivot mode (0-360, relative to zero set).
     * @param heading target heading 0-360; eg: 0
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_rotate_to
    //% block="Rotate To %heading ° speed %speed"
    //% group="Gorilla Go" weight=95
    //% heading.min=0 heading.max=360 heading.defl=0
    //% speed.min=0 speed.max=255 speed.defl=100
    //% inlineInputMode=inline
    export function rotateToDegrees(heading: number, speed: number): void {
        if (!initialized) initPCA9685()
        let prevHeading = getDegrees()
        let noChangeMs = 0
        let lastSign = 0

        // Phase 1: coarse — ramp down from full speed starting at 120° out, exit at 40°
        while (true) {
            let diff = ggHeadingDiff(heading, getDegrees())
            if (Math.abs(diff) <= 40) break
            let turnSpeed = Math.abs(diff) < 120
                ? Math.max(55, Math.round(speed * Math.abs(diff) / 120))
                : speed
            let curSign = diff > 0 ? 1 : -1
            if (lastSign != 0 && curSign != lastSign) {
                MotorStop(gg_leftMotor)
                MotorStop(gg_rightMotor)
                basic.pause(200)
                noChangeMs = 0
            }
            lastSign = curSign
            if (diff > 0) {
                driveLeft(turnSpeed)
                MotorStop(gg_rightMotor)
            } else {
                MotorStop(gg_leftMotor)
                driveRight(turnSpeed)
            }
            basic.pause(20)
            let curHeading = getDegrees()
            if (Math.abs(ggHeadingDiff(curHeading, prevHeading)) < 1) {
                noChangeMs += 20
            } else {
                noChangeMs = 0
            }
            prevHeading = curHeading
            if (noChangeMs >= 400 && Math.abs(diff) > 50) {
                if (diff > 0) {
                    driveLeft(255)
                    MotorStop(gg_rightMotor)
                } else {
                    MotorStop(gg_leftMotor)
                    driveRight(255)
                }
                basic.pause(150)
                noChangeMs = 0
            }
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
        basic.pause(300)

        // Phase 2: mid — slow continuous pivot until within 10°
        while (true) {
            let diff = ggHeadingDiff(heading, getDegrees())
            if (Math.abs(diff) <= 10) break
            if (diff > 0) {
                driveLeft(65)
                MotorStop(gg_rightMotor)
            } else {
                MotorStop(gg_leftMotor)
                driveRight(65)
            }
            basic.pause(20)
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
        basic.pause(400)

        // Phase 3: fine — short pulses, max 8 attempts or 2000ms, 0.5° resolution
        let fineStart = input.runningTime()
        for (let i = 0; i < 8; i++) {
            if (input.runningTime() - fineStart > 2000) break
            let diff = ggHeadingDiff(heading, ggRawHeading())
            if (Math.abs(diff) <= 0.5) break
            if (diff > 0) {
                driveLeft(90)
                MotorStop(gg_rightMotor)
            } else {
                MotorStop(gg_leftMotor)
                driveRight(90)
            }
            basic.pause(25)
            MotorStop(gg_leftMotor)
            MotorStop(gg_rightMotor)
            basic.pause(200)
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
    }

    /**
     * Drive straight for a given distance (negative = backward).
     * @param distance distance to travel; eg: 30
     * @param unit cm or inch
     * @param speed motor speed 0-255; eg: 150
     */
    //% blockId=gorilla_drive_straight
    //% block="Drive Straight %distance %unit at speed %speed"
    //% group="Gorilla Go" weight=94
    //% distance.defl=30
    //% speed.min=0 speed.max=255 speed.defl=100
    //% inlineInputMode=inline
    export function driveStraight(distance: number, unit: DistanceUnit, speed: number): void {
        if (!initialized) initPCA9685()
        let distCm = unit == DistanceUnit.Inch ? distance * 2.54 : distance
        let circumference = 3.14159 * gg_leftWheelDia
        let targetTicks = Math.round(Math.abs(distCm) / circumference * gg_ticksPerRev)
        let dir = distCm >= 0 ? 1 : -1
        gg_leftTicks = 0
        gg_rightTicks = 0
        driveLeft(dir * speed)
        driveRight(dir * speed)
        while (gg_leftTicks < targetTicks && gg_rightTicks < targetTicks) {
            basic.pause(5)
        }
        MotorStop(gg_leftMotor)
        MotorStop(gg_rightMotor)
    }

    /**
     * Get current heading in degrees 0-360, relative to zero set by setupRobot.
     */
    //% blockId=gorilla_get_degrees
    //% block="Get Degrees (0-360)"
    //% group="Gorilla Go" weight=93
    export function getDegrees(): number {
        return Math.round((bno055Heading() - gg_zeroHeading + 360) % 360)
    }

    //% blockId=motorbit_get_current_grip_angle
    //% block="Current Grip Angle"
    //% group="Gorilla Go" weight=80
    export function getCurrentGripAngle(): number {
        return gg_currentGripAngle
    }

    /**
     * Move gripper from current angle to a target angle at a given speed.
     * @param targetAngle target angle 0-180; eg: 90
     * @param speed servo speed 1-10; eg: 5
     */
    //% blockId=motorbit_move_gripper_to
    //% block="Move Gripper to %targetAngle ° speed %speed"
    //% group="Gorilla Go" weight=79
    //% targetAngle.min=0 targetAngle.max=180 targetAngle.defl=90
    //% speed.min=1 speed.max=10 speed.defl=5
    //% inlineInputMode=inline
    export function moveGripperTo(targetAngle: number, speed: number): void {
        Servospeed(gg_gripServo, gg_currentGripAngle, targetAngle, speed)
        gg_currentGripAngle = targetAngle
    }

    /**
     * Open the gripper. Optionally specify a starting angle (-1 = use current).
     * @param fromAngle starting angle before opening, -1 = keep current; eg: -1
     */
    //% blockId=motorbit_open_gripper
    //% block="Open Gripper from %fromAngle °"
    //% group="Gorilla Go" weight=86
    //% fromAngle.defl=-1 fromAngle.min=-1 fromAngle.max=180
    export function openGripper(fromAngle: number): void {
        if (fromAngle >= 0) setGripperAngle(fromAngle)
        Servospeed(gg_gripServo, gg_currentGripAngle, gg_gripOpenAngle, 5)
        gg_currentGripAngle = gg_gripOpenAngle
    }

    /**
     * Close the gripper. Optionally specify a starting angle (-1 = use current).
     * @param fromAngle starting angle before closing, -1 = keep current; eg: -1
     */
    //% blockId=motorbit_close_gripper
    //% block="Close Gripper from %fromAngle °"
    //% group="Gorilla Go" weight=85
    //% fromAngle.defl=-1 fromAngle.min=-1 fromAngle.max=180
    export function closeGripper(fromAngle: number): void {
        if (fromAngle >= 0) setGripperAngle(fromAngle)
        Servospeed(gg_gripServo, gg_currentGripAngle, gg_gripCloseAngle, 5)
        gg_currentGripAngle = gg_gripCloseAngle
    }

    /**
     * Open the gripper slowly at a given speed.
     * @param fromAngle starting angle before opening, -1 = keep current; eg: -1
     * @param speed servo speed 1-10; eg: 5
     */
    //% blockId=motorbit_open_gripper_speed
    //% block="Open Gripper from %fromAngle ° speed %speed"
    //% group="Gorilla Go" weight=84
    //% fromAngle.defl=-1 fromAngle.min=-1 fromAngle.max=180
    //% speed.min=1 speed.max=10 speed.defl=5
    export function openGripperWithSpeed(fromAngle: number, speed: number): void {
        if (fromAngle >= 0) setGripperAngle(fromAngle)
        Servospeed(gg_gripServo, gg_currentGripAngle, gg_gripOpenAngle, speed)
        gg_currentGripAngle = gg_gripOpenAngle
    }

    /**
     * Close the gripper slowly at a given speed.
     * @param fromAngle starting angle before closing, -1 = keep current; eg: -1
     * @param speed servo speed 1-10; eg: 5
     */
    //% blockId=motorbit_close_gripper_speed
    //% block="Close Gripper from %fromAngle ° speed %speed"
    //% group="Gorilla Go" weight=83
    //% fromAngle.defl=-1 fromAngle.min=-1 fromAngle.max=180
    //% speed.min=1 speed.max=10 speed.defl=5
    export function closeGripperWithSpeed(fromAngle: number, speed: number): void {
        if (fromAngle >= 0) setGripperAngle(fromAngle)
        Servospeed(gg_gripServo, gg_currentGripAngle, gg_gripCloseAngle, speed)
        gg_currentGripAngle = gg_gripCloseAngle
    }

    // ── Motor ─────────────────────────────────────────────────────────────────────

    //% blockId=motorbit_motor_run block="Motor|%index|speed %speed"
    //% group="Motor" weight=86
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(index: Motors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }
        if (index > 4 || index <= 0)
            return
        let pp = (index - 1) * 2
        let pn = (index - 1) * 2 + 1
        if (speed >= 0) {
            setPwm(pp, 0, speed)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -speed)
        }
    }

    //% blockId=motorbit_stop block="Motor Stop|%index|"
    //% group="Motor" weight=82
    export function MotorStop(index: Motors): void {
        MotorRun(index, 0);
    }

    //% blockId=motorbit_stop_all block="Motor Stop All"
    //% group="Motor" weight=81
    //% blockGap=50
    export function MotorStopAll(): void {
        if (!initialized) {
            initPCA9685()
        }
        for (let idx = 1; idx <= 4; idx++) {
            stopMotor(idx);
        }
    }

    /**
     * Execute single motors with delay
     * @param index Motor Index; eg: A01A02, B01B02, A03A04, B03B04
     * @param speed [-255-255] speed of motor; eg: 150, -150
     * @param delay seconde delay to stop; eg: 1
    */
    //% blockId=motorbit_motor_rundelay block="Motor|%index|speed %speed|delay %delay|s"
    //% group="Motor" weight=85
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDelay(index: Motors, speed: number, delay: number): void {
        MotorRun(index, speed);
        basic.pause(delay * 1000);
        MotorRun(index, 0);
    }

    /**
     * Execute two motors at the same time
     * @param motor1 First Motor; eg: A01A02, B01B02
     * @param speed1 [-255-255] speed of motor; eg: 150, -150
     * @param motor2 Second Motor; eg: A03A04, B03B04
     * @param speed2 [-255-255] speed of motor; eg: 150, -150
    */
    //% blockId=motorbit_motor_dual block="Motor|%motor1|speed %speed1|%motor2|speed %speed2"
    //% group="Motor" weight=84
    //% inlineInputMode=inline
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDual(motor1: Motors, speed1: number, motor2: Motors, speed2: number): void {
        MotorRun(motor1, speed1);
        MotorRun(motor2, speed2);
    }

    /**
     * Execute two motors at the same time
     * @param motor1 First Motor; eg: A01A02, B01B02
     * @param speed1 [-255-255] speed of motor; eg: 150, -150
     * @param motor2 Second Motor; eg: A03A04, B03B04
     * @param speed2 [-255-255] speed of motor; eg: 150, -150
    */
    //% blockId=motorbit_motor_dualDelay block="Motor|%motor1|speed %speed1|%motor2|speed %speed2|delay %delay|s "
    //% group="Motor" weight=83
    //% inlineInputMode=inline
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=5
    export function MotorRunDualDelay(motor1: Motors, speed1: number, motor2: Motors, speed2: number, delay: number): void {
        MotorRun(motor1, speed1);
        MotorRun(motor2, speed2);
        basic.pause(delay * 1000);
        MotorRun(motor1, 0);
        MotorRun(motor2, 0);
    }

    // ── Servo ─────────────────────────────────────────────────────────────────────

    /**
     * Servo Execute
     * @param index Servo Channel; eg: S1
     * @param degree [0-180] degree of servo; eg: 0, 90, 180
    */
    //% blockId=motorbit_servo block="Servo|%index|degree|%degree"
    //% group="Servo" weight=100
    //% degree.defl=90
    //% degree.min=0 degree.max=180
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function Servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
     * Servo Execute
     * @param index Servo Channel; eg: S1
     * @param degree1 [0-180] degree of servo; eg: 0, 90, 180
     * @param degree2 [0-180] degree of servo; eg: 0, 90, 180
     * @param speed [1-10] speed of servo; eg: 1, 10
    */
    //% blockId=motorbit_servospeed block="Servo|%index|degree start %degree1|end %degree2|speed %speed"
    //% group="Servo" weight=96
    //% degree1.min=0 degree1.max=180
    //% degree2.min=0 degree2.max=180
    //% speed.min=1 speed.max=10
    //% inlineInputMode=inline
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function Servospeed(index: Servos, degree1: number, degree2: number, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        if (degree1 > degree2) {
            for (let i = degree1; i > degree2; i--) {
                let v_us = (i * 1800 / 180 + 600) // 0.6 ~ 2.4
                let value = v_us * 4096 / 20000
                basic.pause(4 * (10 - speed));
                setPwm(index + 7, 0, value)
            }
        } else {
            for (let i = degree1; i < degree2; i++) {
                let v_us = (i * 1800 / 180 + 600) // 0.6 ~ 2.4
                let value = v_us * 4096 / 20000
                basic.pause(4 * (10 - speed));
                setPwm(index + 7, 0, value)
            }
        }
    }

    // ── GeekServo ─────────────────────────────────────────────────────────────────

    /**
     * Geek Servo
     * @param index Servo Channel; eg: S1
     * @param degree [-45-225] degree of servo; eg: -45, 90, 225
    */
    //% blockId=motorbit_gservo block="Geek Servo|%index|degree %degree=protractorPicker"
    //% group="GeekServo" weight=96
    //% blockGap=50
    //% degree.defl=90
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = ((degree - 90) * 20 / 3 + 1500) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
     * GeekServo2KG
     * @param index Servo Channel; eg: S1
     * @param degree [0-360] degree of servo; eg: 0, 180, 360
    */
    //% blockId=motorbit_gservo2kg block="GeekServo2KG|%index|degree %degree"
    //% group="GeekServo" weight=95
    //% blockGap=50
    //% degree.min=0 degree.max=360
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo2KG(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let v_us = (Math.floor((degree) * 2000 / 350) + 500) //fixed
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
     * GeekServo5KG
     * @param index Servo Channel; eg: S1
     * @param degree [0-360] degree of servo; eg: 0, 180, 360
    */
    //% blockId=motorbit_gservo5kg block="GeekServo5KG|%index|degree %degree"
    //% group="GeekServo" weight=94
    //% degree.min=0 degree.max=360
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo5KG(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        const minInput = 0;
        const maxInput = 355;
        const minOutput = 500;
        const maxOutput = 2500;
        const v_us = ((degree - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    //% blockId=motorbit_gservo5kg_motor block="GeekServo5KG_MotorEN|%index|speed %speed"
    //% group="GeekServo" weight=93
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo5KG_Motor(index: Servos, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        const minInput = -255;
        const maxInput = 255;
        const minOutput = 5000;
        const maxOutput = 3000;
        const v_us = ((speed - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    // ── Stepper Motor ─────────────────────────────────────────────────────────────

    //% blockId=motorbit_stepper_degree block="Stepper 28BYJ-48|%index|degree %degree"
    //% group="Stepper Motor" weight=91
    export function StepperDegree(index: Steppers, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        setStepper(index, degree > 0);
        degree = Math.abs(degree);
        basic.pause(10240 * degree / 360);
        MotorStopAll()
    }

    //% blockId=motorbit_stepper_turn block="Stepper 28BYJ-48|%index|turn %turn"
    //% group="Stepper Motor" weight=90
    export function StepperTurn(index: Steppers, turn: Turns): void {
        let degree = turn;
        StepperDegree(index, degree);
    }

    //% blockId=motorbit_stepper_dual block="Dual Stepper(Degree) |STPM1_2 %degree1| STPM3_4 %degree2"
    //% group="Stepper Motor" weight=89
    export function StepperDual(degree1: number, degree2: number): void {
        if (!initialized) {
            initPCA9685()
        }
        setStepper(1, degree1 > 0);
        setStepper(2, degree2 > 0);
        degree1 = Math.abs(degree1);
        degree2 = Math.abs(degree2);
        basic.pause(10240 * Math.min(degree1, degree2) / 360);
        if (degree1 > degree2) {
            stopMotor(3); stopMotor(4);
            basic.pause(10240 * (degree1 - degree2) / 360);
        } else {
            stopMotor(1); stopMotor(2);
            basic.pause(10240 * (degree2 - degree1) / 360);
        }
        MotorStopAll()
    }

    /**
     * Stepper Car move forward
     * @param distance Distance to move in cm; eg: 10, 20
     * @param diameter diameter of wheel in mm; eg: 48
    */
    //% blockId=motorbit_stpcar_move block="Car Forward|Distance(cm) %distance|Wheel Diameter(mm) %diameter"
    //% group="Stepper Motor" weight=88
    export function StpCarMove(distance: number, diameter: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let delay = 10240 * 10 * distance / 3 / diameter; // use 3 instead of pi
        setStepper(1, delay > 0);
        setStepper(2, delay > 0);
        delay = Math.abs(delay);
        basic.pause(delay);
        MotorStopAll()
    }

    /**
     * Stepper Car turn by degree
     * @param turn Degree to turn; eg: 90, 180, 360
     * @param diameter diameter of wheel in mm; eg: 48
     * @param track track width of car; eg: 125
    */
    //% blockId=motorbit_stpcar_turn block="Car Turn|Degree %turn|Wheel Diameter(mm) %diameter|Track(mm) %track"
    //% weight=87
    //% group="Stepper Motor" blockGap=50
    export function StpCarTurn(turn: number, diameter: number, track: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let delay = 10240 * turn * track / 360 / diameter;
        setStepper(1, delay < 0);
        setStepper(2, delay > 0);
        delay = Math.abs(delay);
        basic.pause(delay);
        MotorStopAll()
    }

    // ── RUS-04 ────────────────────────────────────────────────────────────────────

    //% blockId="motorbit_rus04" block="On-board Ultrasonic part %index show color %rgb effect %effect"
    //% group="RUS-04" weight=78
    export function motorbit_rus04(index: RgbUltrasonics, rgb: RgbColors, effect: ColorEffect): void {
        sensors.board_rus04_rgb(DigitalPin.P16, 4, index, rgb, effect);
    }

    //% blockId=Ultrasonic_reading_distance block="On-board Ultrasonic reading distance"
    //% group="RUS-04" weight=77
    export function Ultrasonic_reading_distance(): number {
        return sensors.Ultrasonic(DigitalPin.P2);
    }

    // ── RGB ───────────────────────────────────────────────────────────────────────

    //% blockId=Setting_the_on_board_lights block="Setting the on-board lights %index color %rgb"
    //% group="RGB" weight=76
    export function Setting_the_on_board_lights(index: Offset, rgb: RgbColors): void {
        sensors.board_rus04_rgb(DigitalPin.P16, index, 0, rgb, rgb_ColorEffect.None);
    }

    //% blockId=close_the_on_board_lights block="close the on-board lights %index color"
    //% group="RGB" weight=75
    export function close_the_on_board_lights(index: Offset): void {
        sensors.board_rus04_rgb(DigitalPin.P16, index, 0, RgbColors.Black, rgb_ColorEffect.None);
    }

    //% blockId=close_all_the_on_board_lights block="close all the on-board lights"
    //% group="RGB" weight=74
    export function close_all_the_on_board_lights(): void {
        sensors.board_rus04_rgb(DigitalPin.P16, 0, 0, RgbColors.Black, rgb_ColorEffect.None);
        sensors.board_rus04_rgb(DigitalPin.P16, 1, 0, RgbColors.Black, rgb_ColorEffect.None);
        sensors.board_rus04_rgb(DigitalPin.P16, 2, 0, RgbColors.Black, rgb_ColorEffect.None);
        sensors.board_rus04_rgb(DigitalPin.P16, 3, 0, RgbColors.Black, rgb_ColorEffect.None);
    }

}
