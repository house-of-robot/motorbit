# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Microsoft MakeCode/PXT extension package for the BBC Micro:Bit that drives the Motor:Bit expansion board (by Emakefun). Written in TypeScript and compiled by the PXT toolchain into MakeCode blocks and JavaScript for the Micro:Bit runtime.

## Build Commands

Requires Node.js 8.9.4+ and the PXT CLI (`npm install -g pxt`, then `pxt target microbit`).

```sh
make build    # pxt build — compile TypeScript
make deploy   # pxt deploy — push to connected Micro:Bit (default make target)
make test     # pxt test — run test.ts on device
```

Other PXT commands: `pxt install`, `pxt clean`, `pxt serial` (serial monitor).

## Project Structure

- **[motorbit.ts](motorbit.ts)** — entire driver implementation; all public API lives here
- **[test.ts](test.ts)** — runtime code examples that run on device (not unit tests)
- **[enums.d.ts](enums.d.ts)** — pin and IR remote button enum definitions
- **[pxt.json](pxt.json)** — PXT package manifest (name, version, dependencies, target)
- **[_locales/zh/motorbit-strings.json](_locales/zh/motorbit-strings.json)** — Chinese block labels

## Architecture

All driver logic is in `motorbit.ts` under the `motorbit` namespace. The board uses a **PCA9685 PWM controller** (I2C address `0x40`) for all motor and servo outputs. The micro:bit talks to it via I2C; `initPCA9685()` is called lazily on first use via an `initialized` flag.

**Five functional areas in the namespace:**

| Area | Functions | Notes |
|------|-----------|-------|
| DC Motors (M1–M4) | `MotorRun`, `MotorStop`, `MotorRunDual`, `*Delay` variants | Speed −255 to +255 maps to PWM 0–4095 |
| Servos (S1–S8) | `Servo`, `Servospeed`, `EM_GeekServo*` variants | Angles convert to 0.6–2.4 ms pulse widths |
| Stepper Motors | `StepperDegree`, `StepperTurn`, `StpCarMove`, `StpCarTurn` | Phase-based step sequencing |
| RGB / LEDs | `Setting_the_on_board_lights`, `close_*` | 4 onboard LEDs + ultrasonic sensor LEDs |
| Ultrasonic | `Ultrasonic_reading_distance` | Distance via pin P2 |

External dependencies (declared in `pxt.json`):
- `emakefun/pxt-irRemote` — IR remote receiver
- `emakefun/pxt-sensorbit` — ultrasonic and RGB sensor helpers

## MakeCode Block Annotations

Functions are exposed to the visual block editor via `//% block=` JSDoc annotations. When editing public API signatures or block text, keep annotations consistent with the Chinese localization strings in `_locales/zh/`.

## Hardware Notes

- Motor:Bit V1.0 and V2.0 differ in power-switch position; both are supported by the same driver.
- Buzzer → P0, IR receiver → P5, RGB LEDs → P16, I2C (LCD etc.) via PH2.0 connector.
- Stepper motors use 5-wire connections; two steppers can run simultaneously via `StepperDual`.


# Add
hardware มีเพิ่ม motor with encoder และ เซนเซอร์ BNO055 

ที่ motorbit.ts ให้เพิ่ม Group ชื่อ Gorilla Go ซึ่งมี 

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
    )

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
    )

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
    //% speed.min=0 speed.max=255 speed.defl=150
    //% inlineInputMode=inline
    export function driveStraight(distance: number, unit: DistanceUnit, speed: number)

        /**
     * Turn left by a relative angle using tank mode (both wheels move).
     * @param degrees how many degrees to turn left; eg: 90
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_turn_left_for
    //% block="Turn Left %degrees ° speed %speed"
    //% group="Gorilla Go" weight=98
    //% degrees.min=0 degrees.max=360 degrees.defl=90
    //% speed.min=0 speed.max=255 speed.defl=120
    //% inlineInputMode=inline
    export function turnLeftForDegrees(degrees: number, speed: number)


        /**
     * Turn right by a relative angle using tank mode (both wheels move).
     * @param degrees how many degrees to turn right; eg: 90
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_turn_right_for
    //% block="Turn Right %degrees ° speed %speed"
    //% group="Gorilla Go" weight=97
    //% degrees.min=0 degrees.max=360 degrees.defl=90
    //% speed.min=0 speed.max=255 speed.defl=120
    //% inlineInputMode=inline
    export function turnRightForDegrees(degrees: number, speed: number)


        /**
     * Turn to face an absolute heading using tank mode (0-360, relative to zero set).
     * @param heading target heading 0-360; eg: 0
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_heading_to
    //% block="Heading To %heading ° speed %speed"
    //% group="Gorilla Go" weight=96
    //% heading.min=0 heading.max=360 heading.defl=0
    //% speed.min=0 speed.max=255 speed.defl=120
    //% inlineInputMode=inline
    export function headingToDegrees(heading: number, speed: number)

    /**
     * Rotate to face an absolute heading using pivot mode (0-360, relative to zero set).
     * @param heading target heading 0-360; eg: 0
     * @param speed motor speed 0-255; eg: 120
     */
    //% blockId=gorilla_rotate_to
    //% block="Rotate To %heading ° speed %speed"
    //% group="Gorilla Go" weight=95
    //% heading.min=0 heading.max=360 heading.defl=0
    //% speed.min=0 speed.max=255 speed.defl=120
    //% inlineInputMode=inline
    export function rotateToDegrees(heading: number, speed: number)


        /**
     * Get current heading in degrees 0-360, relative to zero set by setupRobot.
     */
    //% blockId=gorilla_get_degrees
    //% block="Get Degrees (0-360)"
    //% group="Gorilla Go" weight=93
    export function getDegrees()


    /**
     * Open the gripper. open from current angle
     */
    //% blockId=motorbit_open_gripper
    //% block="Open Gripper"
    //% group="Gorilla Go"
    //% weight=86
    export function openGripper()


    /**
     * Close the gripper to grab an object.  close from current angle
     */
    //% blockId=motorbit_close_gripper
    //% block="Close Gripper"
    //% group="Gorilla Go"
    //% weight=85
    export function closeGripper()


    /**
     * Open the gripper slowly at a given speed. open from current angle
     * @param speed servo speed 1-10; eg: 5
     */
    //% blockId=motorbit_open_gripper_speed
    //% block="Open Gripper speed %speed"
    //% group="Gorilla Go"
    //% weight=84
    //% speed.min=1 speed.max=10 speed.defl=5
    export function openGripperWithSpeed(speed: number)

/**
     * Close the gripper slowly at a given speed. close from current angle
     * @param speed servo speed 1-10; eg: 5
     */
    //% blockId=motorbit_close_gripper_speed
    //% block="Close Gripper speed %speed"
    //% group="Gorilla Go"
    //% weight=83
    //% speed.min=1 speed.max=10 speed.defl=5
    export function closeGripperWithSpeed(speed: number)

