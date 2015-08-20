import React from "react";
import Radium from "radium";
import d3 from "d3";
import _ from "lodash";
import {VictoryLine} from "victory-line";
import {VictoryAxis} from "victory-axis";

@Radium
class VictoryChart extends React.Component {
  constructor(props) {
    super(props);
    // Initialize state
    this.state = {};
    this.state.data = [];
    // if data is given in props, add it to this.state.data
    if (this.props.data) {
      this.state.data.push(this.props.data);
    }
    // if y is given in props, construct data for all y, and add it to this.state.data
    if (this.props.y) {
      const xArray = this.returnOrGenerateX(); // returns an array
      const yArray = this.returnOrGenerateY(); // returns an array of arrays
      let n;
      // create a dataset from x and y with n points
      const datasets = _.map(yArray, (y) => {
        n = _.min([xArray.length, y.length]);
        return _.zip(_.take(xArray, n), _.take(y, n));
      });

      const objs = _.chain(datasets)
        .map((objArray, idx) => {
          return [
            "data-" + idx,
            _.map(
              objArray,
              (obj) => {
                return {x: obj[0], y: obj[1]};
              }
            )
          ];
        })
        .object()
        .value();
      this.state.data.push(objs);
    }
  }

  returnOrGenerateX() {
    if (this.props.x) {
      return this.props.x;
    }
    // if x is not given in props, create an array of values evenly
    // spaced across the x domain
    const domainFromProps = (this.props.domain && this.props.domain.x) ?
      this.props.domain.x : this.props.domain;
    // note: scale will never be undefined thanks to default props
    const domainFromScale = this.props.scale.x ?
      this.props.scale.x().domain() : this.props.scale().domain();
    // use this.props.domain if specified
    const domain = domainFromProps || domainFromScale;
    const samples = this._getSampleNumber();
    const step = _.max(domain) / samples;
    return _.range(_.min(domain), _.max(domain), step);
  }

  // helper for returnOrGenerateX
  _getSampleNumber() {
    if (_.isArray(this.props.y) && _.isNumber(this.props.y[0])) {
      return this.props.y.length;
    }
    return this.props.samples;
  }

  returnOrGenerateY() {
    // Always return an array of arrays.
    const y = this.props.y;
    const x = this.returnOrGenerateX();

    if (_.isFunction(y)) {
      return [_.map(x, (datum) => y(datum))];
    } else if (_.isArray(y)) {
      // y is an array of functions
      if (_.isFunction(y[0])) {
        return _.map(y, (yFn) => _.map(x, (datum) => yFn(datum)));
      } else {
        return [y];
      }
    } else {
      // asplode
      return null;
    }
  }

  getStyles() {
    return _.merge({
      color: "#000",
      fontSize: 12,
      margin: 50,
      width: 500,
      height: 300
    }, this.props.style);
  }

  getDomain(type) {
    if (this.props.domain) {
      return this._getDomainFromProps(type);
    }
    return this._getDomainFromData(type);
  }

  // helper method for getDomain
  _getDomainFromProps(type) {
    if (this.props.domain[type]) {
      // if the domain for this type is given, return it
      return this.props.domain[type];
    }
    // if the domain is given without the type specified, return the domain (reversed for y)
    return type === "x" ? this.props.domain : this.props.domain.concat().reverse();
  }

  // helper method for getDomain
  _getDomainFromData(type) {
    const data = _.map(this.state.data, (dataset) => {
      return _.flatten(_.values(dataset));
    });
    let min = [];
    let max = [];
    _.each(data, (datum) => {
      min.push(_.min(_.pluck(datum, type)));
      max.push(_.max(_.pluck(datum, type)));
    });
    return type === "x" ? [_.min(min), _.max(max)] : [_.max(max), _.min(min)];
  }

  getRange(type) {
    if (this.props.range) {
      return this.props.range[type] ? this.props.range[type] : this.props.range;
    }
    // if the range is not given in props, calculate it from width, height and margin
    const style = this.getStyles();
    const dimension = type === "x" ? "width" : "height";
    return [style.margin, style[dimension] - style.margin];
  }


  render() {
    const styles = this.getStyles();
    const lines = _.map(this.state.data, (data, index) => {

      return (
        <VictoryLine
          data={_.values(data)[0]}
          style={styles}
          domain={{x: this.getDomain("x"), y: this.getDomain("y")}}
          range={{x: this.getRange("x"), y: this.getRange("y")}}
          ref={_.isString(_.keys(data)) ? _.keys(data) : "data-" + _.keys(data)}
          key={index}/>
      );
    });
    return (
      <svg style={{width: styles.width, height: styles.height}}>
        {lines}
        <VictoryAxis
          domain={this.getDomain("x")}
          orientation="bottom"
          style={styles}/>
        <VictoryAxis
          domain={this.getDomain("y")}
          orientation="left"
          style={styles}/>
      </svg>
    );
  }
}

VictoryChart.propTypes = {
  color: React.PropTypes.string
};

VictoryChart.propTypes = {
  style: React.PropTypes.node,
  data: React.PropTypes.arrayOf(
    React.PropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  ),
  x: React.PropTypes.array,
  y: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.func
  ]),
  domain: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.arrayOf(React.PropTypes.number),
      y: React.PropTypes.arrayOf(React.PropTypes.number)
    })
  ),
  range: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.arrayOf(React.PropTypes.number),
      y: React.PropTypes.arrayOf(React.PropTypes.number)
    })
  ),
  scale: React.PropTypes.oneOfType([
    React.PropTypes.func,
    React.PropTypes.objectOf(
      React.PropTypes.shape({
        x: React.PropTypes.func,
        y: React.PropTypes.func
      })
    )
  ]),
  samples: React.PropTypes.number,
  interpolation: React.PropTypes.oneOf([
    "linear",
    "linear-closed",
    "step",
    "step-before",
    "step-after",
    "basis",
    "basis-open",
    "basis-closed",
    "bundle",
    "cardinal",
    "cardinal-open",
    "cardinal-closed",
    "monotone"
  ]),
  axisOrientation: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.string,
      y: React.PropTypes.string
    })
  ),
  axisLabels: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.string,
      y: React.PropTypes.string
    })
  ),
  labelPadding: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  ),
  gridLines: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.bool,
      y: React.PropTypes.bool
    })
  ),
  tickValues: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.arrayOf(React.PropTypes.number),
      y: React.PropTypes.arrayOf(React.PropTypes.number)
    })
  ),
  tickFormat: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.func,
      y: React.PropTypes.func
    })
  ),
  tickCount: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  ),
  tickSize: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  ),
  tickPadding: React.PropTypes.objectOf(
    React.PropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  ),
};

VictoryChart.defaultProps = {
  interpolation: "basis",
  samples: 100,
  scale: () => d3.scale.linear(),
  y: (x) => (x * x),
  axisOrientation: {
    x: "bottom",
    y: "left"
  }
};

export default VictoryChart;
