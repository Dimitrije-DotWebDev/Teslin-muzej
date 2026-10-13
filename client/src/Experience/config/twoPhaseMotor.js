export default {
    motorWindings: {
        name: 'Tube64',
        targetNames: ['Tube58', 'Tube59', 'Tube60', 'Tube61', 'Tube62', 'Tube63', 'Tube64', 'Tube65'],
        edge: 'right',
        offset: {x: -0.5, y: 0},
        isMagneticFieldObject: false,
        isMagneticFieldRotationObject: false,
        displayName: 'Навоји мотора',
        description: 'Намотаји мотора повезани су са двофазним напајањем. Њихово заједничко деловање ствара обртно магнетно поље.'
    },
    motorRotor: {
        name: 'Tube54',
        edge: 'up',
        offset: {x: 0, y: 0},
        isMagneticFieldObject: false,
        isMagneticFieldRotationObject: true,
        displayName: 'Ротор мотора',
        description: 'Ротор је покретни део мотора. Деловање магнетног поља доводи до његовог обртања и покретања осовине.'
    },
    motorStator: {
        name: 'Tube07',
        edge: 'up',
        offset: {x: 0.7, y: 0},
        isMagneticFieldObject: true,
        isMagneticFieldRotationObject: false,
        displayName: 'Статор мотора',
        description: 'Статор је непокретни део мотора. У њему су смештени намотаји који стварају магнетно поље око ротора.'
    },
    generatorStator: {
        name: 'Box01',
        edge: 'up',
        offset: {x: 0, y: 0},
        isMagneticFieldObject: false,
        isMagneticFieldRotationObject: false,
        displayName: 'Статор генератора',
        description: 'Статор је непокретни део генератора. Заједно са ротором учествује у претварању механичке енергије у електричну.'
    },
    generatorRotor: {
        name: 'Tube67',
        edge: 'right',
        offset: {x: 0, y: 0},
        isMagneticFieldObject: false,
        isMagneticFieldRotationObject: false,
        displayName: 'Ротор генератора',
        description: 'Ротор је обртни део генератора. Његово кретање учествује у стварању променљивог магнетног флукса.'
    },
    conductor: {
        name: 'Line03',
        edge: 'bottom',
        offset: {x: 0, y: 0},
        isMagneticFieldObject: false,
        isMagneticFieldRotationObject: false,
        displayName: 'Проводник',
        description: 'Проводник повезује делове електричног кола и омогућава протицање струје између генератора и мотора.'
    },
};
