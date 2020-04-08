
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Creates momentum strategy implementations. The default
 * TransitionMomentum will be returned by default, unless the client
 * enables the experimental TimeoutMomentum by calling
 * useTimeoutStrategy() with a value of true.
 */

goog.provide('wireless.fx.MomentumFactory');

goog.require('wireless.fx.Momentum.Strategy');
goog.require('wireless.fx.TimeoutMomentum');
goog.require('wireless.fx.TransitionMomentum');



/**
 * @constructor
 */
wireless.fx.MomentumFactory = function() {

};


/**
 * @define {boolean} Enforce transitions momentum strategy. Allows the timeout
 * momentum strategy code to be compiled out.
 */
wireless.fx.MomentumFactory.ENFORCE_TRANSITIONS = false;


/**
 * @define {boolean} Enforce timeouts momentum strategy. Allows the transitions
 * momentum strategy code to be compiled out.
 */
wireless.fx.MomentumFactory.ENFORCE_TIMEOUTS = false;


/**
 * The MomentumFactory singleton.
 * @type {!wireless.fx.MomentumFactory}
 * @private
 */
wireless.fx.MomentumFactory.INSTANCE_ = new wireless.fx.MomentumFactory();


/**
 * The momentum strategy.
 * @type {wireless.fx.Momentum.Strategy}
 * @private
 */
wireless.fx.MomentumFactory.prototype.strategy_ =
    wireless.fx.MomentumFactory.ENFORCE_TIMEOUTS ?
        wireless.fx.Momentum.Strategy.TIMEOUTS :
        wireless.fx.Momentum.Strategy.TRANSITIONS;


/**
 * Gets a singleton instance of MomentumFactory.
 * @return {!wireless.fx.MomentumFactory} The MomentumFactory
 *     singleton.
 */
wireless.fx.MomentumFactory.getInstance = function() {
  return wireless.fx.MomentumFactory.INSTANCE_;
};


/**
 * Creates a new momentum instance.
 * @param {!wireless.fx.MomentumDelegate} momentumDelegate The momentum
 *     delegate.
 * @return {!wireless.fx.Momentum} A momentum strategy.
 */
wireless.fx.MomentumFactory.prototype.createMomentum =
    function(momentumDelegate) {
  var strategy;
  if (wireless.fx.MomentumFactory.ENFORCE_TIMEOUTS) {
    strategy = new wireless.fx.TimeoutMomentum();
  } else if (wireless.fx.MomentumFactory.ENFORCE_TRANSITIONS) {
    strategy = new wireless.fx.TransitionMomentum();
  } else {
    switch (this.strategy_) {
      case wireless.fx.Momentum.Strategy.TIMEOUTS:
        strategy = new wireless.fx.TimeoutMomentum();
        break;
      case wireless.fx.Momentum.Strategy.TRANSITIONS:
        strategy = new wireless.fx.TransitionMomentum();
        break;
    }
  }
  strategy.setMomentumDelegate(momentumDelegate);
  return strategy;
};


/**
 * Tells the factory whether to use the experimental timeout strategy.
 * @param {wireless.fx.Momentum.Strategy} strategy The momentum strategy.
 */
wireless.fx.MomentumFactory.prototype.setStrategy = function(strategy) {
  if (wireless.fx.MomentumFactory.ENFORCE_TIMEOUTS ||
      wireless.fx.MomentumFactory.ENFORCE_TRANSITIONS) {
    goog.asserts.assert(strategy == this.strategy_,
        'Based on your compile settings, the momentum strategy is enforced ' +
        'to be: (' + this.strategy_ + ').');
  } else {
    this.strategy_ = strategy;
  }
};
