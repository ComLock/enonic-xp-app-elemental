import R from 'render-js/src/class.es';
import merge from 'deepmerge';


//import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';
import {
    getComponent,
    getContent as getCurrentContent
} from '/lib/xp/portal';


function nameValueArrayToObject(arr) {
    const o = {};
    arr.forEach((property) => {
        o[property.name] = property.value;
    });
    return o;
}


function breakpointsArrayToObject(arr) {
    const o = {};
    arr.forEach((breakpoint) => {
        o[`minWidth${breakpoint.minWidth}`] = nameValueArrayToObject(breakpoint.style ? forceArray(breakpoint.style) : []);
    });
    return o;
}


export function get() {
    const {config} = getComponent(); //log.info(toStr({config}));
    const elementContent = config.elementId
        ? getContentByKey({key: config.elementId})
        : getCurrentContent(); //log.info(toStr({elementContent}));
    const {data} = elementContent; //log.info(toStr({data}));
    const tag = config.tag || data.tag || 'div';

    const dataAttributes = nameValueArrayToObject(data.attributes ? forceArray(data.attributes) : []); //log.info(toStr({dataAttributes}));
    const configAttributes = nameValueArrayToObject(config.attributes ? forceArray(config.attributes) : []); //log.info(toStr({configAttributes}));
    const attributes = merge(dataAttributes, configAttributes); //log.info(toStr({attributes}));

    const dataStyle = nameValueArrayToObject(data.style ? forceArray(data.style) : []); //log.info(toStr({dataStyle}));
    const configStyle = nameValueArrayToObject(config.style ? forceArray(config.style) : []); //log.info(toStr({configStyle}));
    const style = merge(dataStyle, configStyle); //log.info(toStr({style}));

    const dataBreakPoints = breakpointsArrayToObject(data.breakpoints ? forceArray(data.breakpoints) : []); //log.info(toStr({dataBreakPoints}));
    const configBreakPoints = breakpointsArrayToObject(config.breakpoints ? forceArray(config.breakpoints) : []); //log.info(toStr({configBreakPoints}));
    const breakpoints = merge(dataBreakPoints, configBreakPoints); //log.info(toStr({breakpoints}));

    attributes._s = style;
    attributes._m = breakpoints;
    //log.info(toStr({attributes}));

    const content = config.content || data.content || '';
    const dom = R[tag](attributes, content);
    const r = R.render(dom);
    return {
        body: r.html,
        contentType: 'text/html; charset=utf-8',
        pageContributions: {
            headEnd: [
                R.render(R.style(r.css.join(''))).html
            ]
        }
    };
}
