Numbas.addExtension('optimisation',['util','math','jme'], function(optimisation) {

var util = Numbas.util;

function makeFrame(data,extra) {
    extra = extra || {};
    for(var k in extra) {
        data[k] = extra[k];
    }
    var out = {};
    for(var k in data) {
        if(Array.isArray(data[k])) {
            out[k] = Numbas.util.copyarray(data[k],true);
        } else {
            out[k] = data[k];
        }
    }
    return out;
}

optimisation.nw_corner = function(supplies,demands) {
    supplies = supplies.slice();
    demands = demands.slice();
    var out = [];

    var frames = [];
    function frame(extra) {
        var f = {grid: out, supplies: supplies, demands: demands};
        frames.push(makeFrame(f,extra));
    }

    for(var s=0;s<supplies.length;s++) {
        var row = [];
        out.push(row);
        for(var d=0;d<demands.length;d++) {
            row.push(0);
        }
    }

    frame();

    for(var d=0;d<demands.length;d++) {
        var demand = demands[d];
        for(var s=0;s<supplies.length;s++) {
            var amount = Math.min(demands[d],supplies[s]);
            if(amount>0) {
                out[s][d] = amount;
                demands[d] -= amount;
                supplies[s] -= amount;
                frame({amount:amount,from:s,to:d});
            }
        }
    }
    out.rows = supplies.length;
    out.columns = demands.length;
    return {result: out, frames: frames};
}

optimisation.nw_corner_display = function(frames) {
    var div = $('<div class="optimisation-display"/>');
    frames.map(function(frame) {
        var table = $('<table class="optimisation-table nw-corner-tableau"><thead><tr><td></td></tr></thead><tbody></tbody><tfoot></tfoot></table>');
        for(var i=0;i<frame.demands.length;i++) {
            table.find('thead tr').append($('<th class="demand-label"/>').text(i+1));
        }
        table.find('thead tr').append('<th>Supply</th>');
        for(var i=0;i<frame.grid.length;i++) {
            var tr = $('<tr/>');
            tr.append($('<th class="supply-label" />').text(i));
            for(var j=0;j<frame.grid[i].length;j++) {
                var td = $('<td/>').text(frame.grid[i][j]);
                if(frame.from==i && frame.to==j) {
                    td.addClass('changed');
                }
                tr.append(td);
            }
            tr.append($('<td/>').text(frame.supplies[i]));
            table.find('tbody').append(tr);
        }
        var tr = $('<tr/>');
        tr.append('<th>Demand</th>');
        for(var i=0;i<frame.demands.length;i++) {
            tr.append($('<td/>').text(frame.demands[i]));
        }
        tr.append('<td/>');
        table.find('tfoot').append(tr);
        $(div).append(table);
        return table;
    });
    return div;
}

optimisation.minimum_cost = function(supplies,demands,costs) {

    var frames = [];
    function frame(extra) {
        var data = {
            grid: out,
            supplies: supplies,
            demands: demands,
            costs: costs,
            cost: cost
        }
        frames.push(makeFrame(data,extra));
    }

    var cost = 0;
    var cells = [];
    supplies = supplies.slice();
    demands = demands.slice();
    var out = [];
    for(var s=0;s<supplies.length;s++) {
        var row = [];
        out.push(row);
        for(var d=0;d<demands.length;d++) {
            row.push(0);
            cells.push({s:s,d:d});
        }
    }

    frame();

    while(cells.length) {
        cells.sort(function(a,b) {
            var ca = costs[a.s][a.d];
            var cb = costs[b.s][b.d];
            var aa = Math.min(supplies[a.s],demands[a.d]);
            var ab = Math.min(supplies[b.s],demands[b.d]);
            var more = aa>ab;
            return ca>cb ? -1 : ca<cb ? 1 : aa>ab ? 1 : aa<ab ? -1 : 0;
        });

        var c = cells.pop();

        var supply = supplies[c.s];
        var demand = demands[c.d];
        var amount = Math.min(supply,demand);
        if(amount>0) {
            out[c.s][c.d] = amount;
            supplies[c.s] -= amount;
            demands[c.d] -= amount;
            cost += costs[c.s][c.d]*amount;

            frame({amount:amount,from:c.s,to:c.d});
        }
    }
    out.rows = supplies.length;
    out.columns = demands.length;

    return {result: out, frames: frames};
}

/** Is the given allocation the result of an application of the minimum cost algorithm?
 * At each step you may have more than one choice of allocation: you must assign as much as possible to the cell with the minimum cost, and of those, the cell with the highest available allocation.
 * It is possible for there to be more than one cell fulfilling those criteria. 
 * So, work out which one the student chose, and carry on from there.
 */
optimisation.valid_minimum_cost_allocation = function(supplies,demands,costs,allocation) {
    var cells = [];
    supplies = supplies.slice();
    demands = demands.slice();

    var total_supply = 0;
    supplies.forEach(function(s) {total_supply += s;});
    var total_demand = 0;
    demands.forEach(function(d) {total_demand += d;});


    if(total_supply<total_demand) {
        supplies.push(total_demand-total_supply);
        costs.push(demands.map(function(){return 0}));
    }
    if(total_supply>total_demand) {
        demands.push(total_supply-total_demand);
        costs.forEach(function(r){r.push(0)});
    }

    for(var s=0;s<supplies.length;s++) {
        var row = [];
        for(var d=0;d<demands.length;d++) {
            row.push(0);
            cells.push({s:s,d:d});
        }
    }
    function max_allocation(cell,supplies,demands) {
        return Math.min(supplies[cell.s],demands[cell.d]);
    }


    function min(l,fn) {
        return l.map(fn).sort(function(a,b){return a>b ? 1 : a<b ? -1 : 0})[0];
    }
    function max(l,fn) {
        return l.map(fn).sort(function(a,b){return a>b ? 1 : a<b ? -1 : 0})[l.length-1];
    }

    function allocate(cell,supplies,demands,cells) {
        var supply = supplies[cell.s];
        var demand = demands[cell.d];
        var amount = max_allocation(cell,supplies,demands);
        if(amount>0) {
            supplies = supplies.slice();
            demands = demands.slice();
            supplies[cell.s] -= amount;
            demands[cell.d] -= amount;
        }
        cells = cells.filter(function(c2){return c2!=cell});
        return {supplies: supplies, demands: demands, cells: cells};
    }


    function step(supplies,demands,cells) {
        if(cells.length==0) {
            return true;
        }
        // find remaining cells with minimum cost
        var mincost = min(cells,function(c){return costs[c.s][c.d]});
        var mincostcells = cells.filter(function(c){return costs[c.s][c.d]==mincost});
        // of those, find cells with maximum available allocation
        var maxallocation = max(mincostcells,function(c){return max_allocation(c,supplies,demands)});
        var choose_cells = mincostcells.filter(function(c){return max_allocation(c,supplies,demands)==maxallocation});
        if(mincost!=0) {
            // of those, find cells that the student assigned the maximum allocation to
            choose_cells = choose_cells.filter(function(c){return allocation[c.s][c.d]==max_allocation(c,supplies,demands)});
        }
        if(!choose_cells.length) {
            return false;
        }
        if(maxallocation==0) {
            cells = cells.filter(function(c2){return choose_cells.indexOf(c2)==-1});
            return step(supplies,demands,cells);
        } else {
            var res = choose_cells.some(function(c) {
                var r = allocate(c,supplies,demands,cells);
                if(!r.cells.length) {
                    return true;
                } else {
                    return step(r.supplies,r.demands,r.cells);
                }
            });
            return res;
        }
    }
    return step(supplies,demands,cells);
}


optimisation.minimum_cost_display = function(frames) {
    var div = $('<div class="optimisation-display"/>');
    var frame_htmls = frames.map(function(frame) {
        var frame_div = $('<div class="frame"/>');
        div.append(frame_div);

        var costs_table = $('<table class="optimisation-table minimum-cost-costs"><thead><tr><th>Costs</th></thead><tbody></tbody></table>');
        frame_div.append(costs_table);
        var tableau = $('<table class="optimisation-table minimum-cost-tableau"><thead><tr><td></td></tr></thead><tbody></tbody></table>');
        frame_div.append(tableau);

        for(var i=0;i<frame.demands.length;i++) {
            tableau.find('thead tr').append($('<th class="demand-label"/>').text(i+1));
            costs_table.find('thead tr').append($('<th class="demand-label"/>').text(i+1));
        }
        tableau.find('thead tr').append('<th>Supply</th>');
        for(var i=0;i<frame.grid.length;i++) {
            var tr = $('<tr/>');
            var cost_tr = $('<tr/>');
            tr.append($('<th class="supply-label" />').text(i+1));
            cost_tr.append($('<th class="supply-label" />').text(i+1));
            for(var j=0;j<frame.grid[i].length;j++) {
                var td = $('<td/>').text(frame.grid[i][j]);
                if(frame.from==i && frame.to==j) {
                    td.addClass('changed');
                }
                tr.append(td);

                var cost_td = $('<td/>').text(frame.costs[i][j]);
                if(frame.from==i && frame.to==j) {
                    cost_td.addClass('changed');
                } else if((frame.from!=i && frame.supplies[i]==0) || (frame.to!=j && frame.demands[j]==0)) {
                    cost_td.addClass('covered');
                }
                cost_tr.append(cost_td);
            }
            tr.append($('<td/>').text(frame.supplies[i]));
            tableau.find('tbody').append(tr);
            costs_table.find('tbody').append(cost_tr);
        }
        var tr = $('<tr/>');
        tr.append('<th>Demand</th>');
        for(var i=0;i<frame.demands.length;i++) {
            tr.append($('<td/>').text(frame.demands[i]));
        }
        tr.append('<td/>');
        tableau.find('tbody').append(tr);

        return frame_div;
    });
    return div;
}

optimisation.shadow_costs = function(assignments,allocated,costs) {
    var num_rows = assignments.rows;
    var num_columns = assignments.columns;
    var row_shadows = [];
    var column_shadows = [];
    var found_rows = 0;
    var found_columns = 0;

    // label an arbitrary row with 0 shadow cost, when there are no forced moves
    function arbitrary_zero() {
        for(var i=0;i<num_rows;i++) {
            for(var j=0;j<num_columns;j++) {
                if(allocated[i][j] && row_shadows[i]===undefined && column_shadows[j]===undefined) {
                    row_shadows[i] = 0;
                    found_rows += 1;
                    return;
                }
            }
        }
        throw(new Error("Can't assign a zero shadow cost"));
    }

    arbitrary_zero();
    while(found_rows < num_rows || found_columns < num_columns) {
        var changed = false
        for(var i=0;i<num_rows;i++) {
            for(var j=0;j<num_columns;j++) {
                if(allocated[i][j]) {
                    if(row_shadows[i]!==undefined && column_shadows[j]===undefined) {
                        column_shadows[j] = costs[i][j] - row_shadows[i];
                        found_columns += 1;
                        changed = true;
                    }
                    if(row_shadows[i]===undefined && column_shadows[j]!==undefined) {
                        row_shadows[i] = costs[i][j] - column_shadows[j];
                        found_rows += 1;
                        changed = true;
                    }
                }
            }
        }
        if(!changed) {
            arbitrary_zero();
        }
    }
    var out = assignments.map(function(row,i) {
        return row.map(function(c,j) {
            return row_shadows[i] + column_shadows[j];
        });
    })
    out.rows = num_rows;
    out.columns = num_columns;
    return {
        rows: row_shadows,
        columns: column_shadows,
        shadow_costs: out
    }
}

optimisation.assignment_is_optimal = function(assignments,allocated,costs) {
    var num_rows = assignments.rows;
    var num_columns = assignments.columns;
    var variation = 0;
    if(!allocated) {
        allocated = optimisation.allocations(assignments);
    }

    var res;
    while(!res) {
        try{
            var res = optimisation.shadow_costs(assignments,allocated,costs);
        } catch(e) {
            variation += 1;
            if(variation>500) {
                // tried too many variations - assume the assignment doesn't work in some way
                return false;
            }
            for(var i=0;i<num_rows;i++) {
                for(var j=0;j<num_columns;j++) {
                    if(assignments[i][j]==0) {
                        allocated[i][j] = false;
                    }
                }
            }
            allocated = optimisation.allocations(assignments,allocated,variation);
        }
    }
    var shadows = res.shadow_costs;

    for(var i=0;i<num_rows;i++) {
        for(var j=0;j<num_columns;j++) {
            if(shadows[i][j]>costs[i][j]) {
                return false;
            }
        }
    }
    return true;
}

optimisation.assignment_is_valid = function(assignments,supplies,demands) {
    var num_rows = assignments.rows;
    var num_columns = assignments.columns;

    for(var i=0;i<num_rows;i++) {
        var t = 0;
        for(var j=0;j<num_columns;j++) {
            t += assignments[i][j];
        }
        if(t>supplies[i]) {
            return false;
        }
    }

    for(var j=0;j<num_columns;j++) {
        var t = 0;
        for(var i=0;i<num_rows;i++) {
            t += assignments[i][j];
        }
        if(t!=demands[j]) {
            return false;
        }
    }
    
    return true;
}

optimisation.stepping_stone_loop = function(assignments,allocated,costs) {
    var num_rows = assignments.rows;
    var num_columns = assignments.columns;

    var shadow_costs = optimisation.shadow_costs(assignments,allocated,costs).shadow_costs;

    var starti,startj;
    function find_start() {
        for(var i=0;i<num_rows;i++) {
            for(var j=0;j<num_columns;j++) {
                if(!allocated[i][j] && shadow_costs[i][j]>costs[i][j]) {
                    starti = i;
                    startj = j;
                    return;
                }
            }
        }
    }
    find_start();
    if(starti===undefined) {
        return {path: [], minimum_change: 0};
    }

    function horizontal(i,lastj) {
        for(var j=0;j<num_columns;j++) {
            if(j!==lastj && allocated[i][j]) {
                if(j==startj) {
                    return [[i,j]];
                } else {
                    var v = vertical(j,i);
                    if(v) {
                        return [[i,j]].concat(v);
                    }
                }
            }
        }
        return false;
    }

    function vertical(j,lasti) {
        for(var i=0;i<num_rows;i++) {
            if(i!==lasti && allocated[i][j]) {
                if(i==starti) {
                    return [[i,j]];
                } else {
                    var h = horizontal(i,j);
                    if(h) {
                        return [[i,j]].concat(h);
                    }
                }
            }
        }
        return false;
    }

    var starti,startj;
    var path = horizontal(starti,startj);
    if(path===false) {
        return false;
    }
    path = [[starti,startj]].concat(path);

    var minimum_change = Infinity;
    for(var i=1;i<path.length;i+=2) {
        var assignment = assignments[path[i][0]][path[i][1]];
        if(assignment>0) {
            minimum_change = Math.min(minimum_change,assignment);
        }
    }
    return {
        min_delta: costs[starti][startj]-shadow_costs[starti][startj],
        path: path,
        minimum_change: minimum_change
    }
}

optimisation.apply_stepping_stone_loop = function(assignments,allocated,path,change) {
    var num_rows = assignments.rows;
    var num_columns = assignments.columns;
    assignments = Numbas.util.copyarray(assignments,true);
    allocated = Numbas.util.copyarray(allocated,true);
    path.forEach(function(p,i) {
        var x = p[0];
        var y = p[1];
        assignments[x][y] += i%2 ? -change : change;
        allocated[x][y] = i==0 || assignments[x][y]>0;
    });
    assignments.rows = num_rows;
    assignments.columns = num_columns;
    allocated.rows = num_rows;
    allocated.columns = num_columns;
    return {
        assignments: assignments,
        allocated: allocated
    };
}

optimisation.allocations = function(assignments,allocated,variation) {
    var num_rows = assignments.rows;
    var num_columns = assignments.columns;

    var num_allocated = 0;
    if(allocated===undefined) {
        // create an initial allocation - allocate all positive spaces
        var allocated = assignments.map(function(row,i) {
            return row.map(function(v,j) {
                if(v>0) {
                    num_allocated += 1;
                    return true;
                } else {
                    return false;
                }
            });
        });
    } else {
        // if given an allocation, count the number of allocated spaces
        allocated = Numbas.util.copyarray(allocated,true);
        for(var i=0;i<num_rows;i++) {
            for(var j=0;j<num_columns;j++) {
                num_allocated += allocated[i][j];
            }
        }
    }
    function allocate_zeros(n) {
        var zeros = []
        for(var i=0;i<num_rows;i++) {
            for(var j=0;j<num_columns;j++) {
                if(assignments[i][j]==0 && !allocated[i][j]) {
                    zeros.push([i,j]);
                }
            }
        }
        variation = variation || 0;
        var l = zeros.length;
        for(var i=0;i<n;i++) {
            var zero = zeros[(i+variation)%l];
            allocated[zero[0]][zero[1]] = true;
        }
    }

    // we need rows+columns-1 allocations. If there are fewer, allocate some zero cells
    var slack = num_rows + num_columns - 1 - num_allocated;
    if(slack<0) {
        throw(new Error("oops"));
    }
    if(slack>0) {
        allocate_zeros(slack);
    }
    return allocated;
}

optimisation.stepping_stone = function(assignments,costs) {
    var original_assignments = assignments;

    var frames = [];
    function frame(extra) {
        var shadow = optimisation.shadow_costs(assignments,allocated,costs);
        var data = {
            assignments: assignments,
            allocated: allocated,
            shadow_costs: shadow.shadow_costs,
            row_shadows: shadow.rows,
            column_shadows: shadow.columns,
            costs: costs
        }
        frames.push(makeFrame(data,extra));
    }

    var num_rows = assignments.rows;
    var num_columns = assignments.columns;


    var allocated = optimisation.allocations(assignments);
    var steps = 0;
    var variation = 0;
    var seen = [];
    var states = [];
    while(!optimisation.assignment_is_optimal(assignments,allocated,costs)) {
        frame({
            comment: "Compute the shadow costs $u_i$ and $v_j$ so that $c_{ij} = u_i + v_j$. Set $u_1=0$, and then solve the remaining equations for the cells with allocation.",
            show_shadow_costs: true
        });
        frame({
            comment: "For each cell without an allocation, compute $\\Delta_{ij} = c_{ij}-u_i-v_j$. This is shown in the top-left of each cell in the table below.",
            show_shadow_costs: true,
            show_deltas: true
        });
        steps += 1;
        if(steps>120) {
            throw(new Error("Too many steps in stepping stone"));
        }

        // try to find a loop
        var res = optimisation.stepping_stone_loop(assignments,allocated,costs);
        var psteps = 0;
        while(res==false) {
            psteps += 1;
            if(psteps>20) {
                throw(new Error("Too many path steps"));
            }
            // if there's no loop, there must be allocated zeros. Try allocating different zeros until there's a loop
            for(var i=0;i<num_rows;i++) {
                for(var j=0;j<num_columns;j++) {
                    if(allocated[i][j] && assignments[i][j]==0) {
                        allocated[i][j] = false;
                    }
                }
            }
            variation += 1;
            allocated = optimisation.allocations(assignments,allocated,variation);
            res = optimisation.stepping_stone_loop(assignments,allocated,costs);
        }
        if(!res.minimum_change) {
            break;
        }
        frame({
            comment: "The lowest $\\Delta_{ij}$ is $\\Delta_{"+(res.path[0][0]+1)+","+(res.path[0][1]+1)+"} = "+res.min_delta+"$, so this solution is not optimal.",
            show_shadow_costs: true,
            show_deltas: true
        });
        frame({
            comment: "Assign as much as possible to the cell with the most negative $\\Delta_{ij}$. This involves moving units around in a loop consisting of the cells highlighted below.",
            path: res.path,
            show_shadow_costs: true,
            show_deltas: true
        });
        var path = res.path;
        var res = optimisation.apply_stepping_stone_loop(assignments,allocated,res.path,res.minimum_change);
        assignments = res.assignments;
        allocated = res.allocated;

        frame({
            path: path,
            show_shadow_costs: true,
            show_deltas: true
        });
        frame({
            comment: "The assignment now looks like this:",
            post_comment: "We must recompute the shadow costs to decide if this assignment is optimal."
        });

        var state = [assignments,allocated];
        var state_string = JSON.stringify(state);
        var i = seen.indexOf(state_string);
        if(i>=0) {
            states = states.slice(0,i+1);
            seen = seen.slice(0,i+1);
            variation += 1;
            for(var i=0;i<num_rows;i++) {
                for(var j=0;j<num_columns;j++) {
                    if(allocated[i][j] && assignments[i][j]==0) {
                        allocated[i][j] = false;
                    }
                }
            }
        } else {
            states.push(state);
            seen.push(state_string);
        }

        allocated = optimisation.allocations(assignments,allocated,variation);
    }
    frame({
        comment: "Because every $\\Delta_{ij}$ is non-negative, we can't reduce the total cost by moving any allocation. This assignment is optimal.",
        optimal:true
    });

    assignments.rows = num_rows;
    assignments.columns = num_columns;

    return {
        result: assignments,
        frames: frames
    };     
}

optimisation.stepping_stone_display = function(frames) {
    var div = $('<div class="optimisation-display"/>');
    var frame_htmls = frames.map(function(frame) {
        if(frame.comment) {
            div.append($('<p/>').html(frame.comment));
        }
        var table = $('<table class="optimisation-table stepping-stone"><thead></thead><tbody></tbody><tfoot></tfoot></table>');
        div.append(table);

        var num_rows = frame.assignments.length;
        var num_columns = frame.assignments[0].length;

        var tr = $('<tr/>');
        tr.append('<td/>');
        for(var i=0;i<num_columns;i++) {
            tr.append($('<th/>').text(i+1));
        }
        if(frame.show_shadow_costs) {
            tr.append('<th>$u_i$</th>');
        }
        table.find('thead').append(tr);

        frame.assignments.forEach(function(row,i) {
            var tr = $('<tr/>');
            tr.append($('<th/>').text(i+1));
            row.forEach(function(assignment,j) {
                var shadow_cost = frame.shadow_costs[i][j];
                var cost = frame.costs[i][j];
                var td = $('<td class="cell"/>')
                if(frame.show_deltas) {
                    td.append($('<span class="shadow-cost"/>').text(cost - shadow_cost));
                }
                td.append($('<span class="cost"/>').text(cost));
                td.append($('<span class="assignment"/>').text(frame.allocated[i][j] ? assignment : ''));
                tr.append(td);
            });
            if(frame.show_shadow_costs) {
                var shadow = $('<td/>');
                tr.append(shadow);
                shadow.text(frame.row_shadows[i]);
            }
            table.find('tbody').append(tr);
        });

        if(frame.path) {
            frame.path.forEach(function(pos,n) {
                var i = pos[0];
                var j = pos[1];
                var td = table.find('tbody tr').eq(i).find('td').eq(j);
                td.addClass('path');
                if(n==0) {
                    td.addClass('first');
                }
            });
        }

        if(frame.show_shadow_costs) {
            tr = $('<tr/>');
            tr.append('<th>$v_j$</th>');
            for(var i=0;i<num_columns;i++) {
                var shadow = $('<td/>');
                tr.append(shadow);
                shadow.text(frame.column_shadows[i]);
            }
            tr.append('<td/>');
            table.find('tfoot').append(tr);
        }
        if(frame.post_comment) {
            div.append($('<p/>').html(frame.post_comment));
        }
    });
    return div;
}

optimisation.assignment_cost = function(assignments,costs) {
    var num_rows = assignments.length;
    var num_columns = assignments[0].length;

    var t = 0;
    for(var i=0;i<num_rows;i++) {
        for(var j=0;j<num_columns;j++) {
            t += assignments[i][j]*costs[i][j];
        }
    }
    return t;
}

optimisation.cost_table = function(supply,demand,costs) {
    var table = $('<table class="optimisation-table costs"><thead><tr><td colspan="2"><th colspan="'+demand.length+'">Destination</th><td/></tr></thead><tbody></tbody><tfoot></tfoot></table>');
    var top_tr = $('<tr><td colspan="2"/></tr>');
    var bottom_tr = $('<tr><td/><th>Demand</th></tr>');
    for(var i=0;i<demand.length;i++) {
      top_tr.append($('<th/>').text(i+1));
      bottom_tr.append($('<td/>').text(demand[i]));
    }
    top_tr.append('<th>Supply</th>');
    bottom_tr.append('<td/>');
    table.find('thead').append(top_tr);
    table.find('tfoot').append(bottom_tr);
    for(var i=0;i<supply.length;i++) {
      var tr = $('<tr/>');
      if(i==0) {
        tr.append($('<th>Source</th>').attr('rowspan',supply.length));
      }
      tr.append($('<th/>').text(i+1));
      for(var j=0;j<demand.length;j++) {
        tr.append($('<td/>').text(costs[i][j]));
      }
      tr.append($('<td/>').text(supply[i]));
      table.find('tbody').append(tr);
    }

    return table;
}

optimisation.assignment_table = function(assignments,supply,demand) {
    var table = $('<table class="optimisation-table assignment"><thead><tr><td colspan="2"><th colspan="'+demand.length+'">Destination</th><td/></tr></thead><tbody></tbody><tfoot></tfoot></table>');
    var top_tr = $('<tr><td colspan="2"/></tr>');
    var bottom_tr = $('<tr><td/><th>Demand</th></tr>');
    for(var i=0;i<demand.length;i++) {
      top_tr.append($('<th/>').text(i+1));
      bottom_tr.append($('<td/>').text(demand[i]));
    }
    top_tr.append('<th>Supply</th>');
    bottom_tr.append('<td/>');
    table.find('thead').append(top_tr);
    table.find('tfoot').append(bottom_tr);
    for(var i=0;i<supply.length;i++) {
      var tr = $('<tr/>');
      if(i==0) {
        tr.append($('<th>Source</th>').attr('rowspan',supply.length));
      }
      tr.append($('<th/>').text(i+1));
      for(var j=0;j<demand.length;j++) {
        tr.append($('<td/>').text(assignments[i][j]));
      }
      tr.append($('<td/>').text(supply[i]));
      table.find('tbody').append(tr);
    }

    return table;
}

optimisation.show_cost_calculation = function(assignments,costs) {
    var s = '\\left( \\begin{array}{}';
    var t = 0;
    for(var i=0;i<assignments.rows;i++) {
      if(i>0) {
        s += ' &+ \\\\';
      }
      for(var j=0;j<assignments.columns;j++) {
        if(j>0) {
          s += ' &+& ';
        }
        s += Numbas.math.niceNumber(assignments[i][j])+' \\times '+Numbas.math.niceNumber(costs[i][j]);
        t += assignments[i][j] * costs[i][j];
      }
    }
    s += '\\end{array} \\right)';
    s += ' = '+Numbas.math.niceNumber(t);
    return s;
}

/* Rational arithmetic functions */
function rmul(a,b) {
    var x = a[0]*b[0];
    var y = a[1]*b[1];
    var g = Numbas.math.gcd(x,y);
    if(x==0) {
        return [0,1];
    }
    if(y<0) {
        g = -g;
    }
    return [x/g,y/g];
}
function rdiv(a,b) {
    var x = a[0]*b[1];
    var y = a[1]*b[0];
    var g = Numbas.math.gcd(x,y);
    if(x==0) {
        return [0,1];
    }
    if(y<0) {
        g = -g;
    }
    return [x/g,y/g];
}
function rsub(a,b) {
    var x = a[0]*b[1]-b[0]*a[1];
    var y = a[1]*b[1];
    var g = Numbas.math.gcd(x,y);
    if(x==0) {
        return [0,1];
    }
    if(y<0) {
        g = -g;
    }
    return [x/g,y/g];
}

optimisation.simplex = function(objective,equations,num_variables) {

    var frames = [];
    function frame(extra) {
        var data = {
            tableau: tableau,
            objective: rational_objective,
            basics: optimisation.simplex_find_basics(tableau),
            variable_names: variable_names
        }
        frames.push(makeFrame(data,extra));
    }

    var num_equations = equations.length;
    var tableau = Numbas.util.copyarray(equations,true);

    var num_real = 1;
    var num_slack = 1;
    var variable_names = objective.map(function(q) {
        if(q!=0) {
            return 'x_'+(num_real++);
        } else {
            return 's_'+(num_slack++);
        }
    });

    var num_variables = objective.length;
    var t_objective = objective.map(function(x){return -x});
    t_objective.push(0);
    tableau.push(t_objective);
    var rational_objective = objective.map(function(v){
        return Numbas.math.rationalApproximation(v); 
    });

    tableau = tableau.map(function(row) {
        return row.map(function(v) {
            return Numbas.math.rationalApproximation(v)
        });
    });

    frame();

    var steps = 0;
    while(steps<1000) {
        steps += 1;
        if(steps==1000) {
            throw(new Error("Simplex algorithm took too many steps"));
        }
        // if all coefficients in the top row are nonnegative, solution is optimal
        // otherwise, pick a column with negative value as the pivot
        var pivot_column = null;
        for(var i=0;i<tableau[num_equations].length;i++) {
            if(tableau[num_equations][i][0]<0) {
                pivot_column = i;
                break;
            }
        }
        if(pivot_column===null) {
            break;
        }

        // find pivot column
        for(var i=0;i<num_variables;i++) {
            if(tableau[num_equations][i][0]<0) {
                break;
            }
        }
        var pivot_column = i;

        // find pivot row
        var min_ratio = null;
        var best = null;
        var ratios = [];
        for(var i=0;i<tableau.length;i++) {
            var ratio = rdiv(tableau[i][num_variables],tableau[i][pivot_column]);
            ratios.push(ratio);
            ratio = ratio[0]/ratio[1];
            if(ratio>0 && (min_ratio===null || ratio<min_ratio)) {
                min_ratio = ratio;
                best = i;
            }
        }
        var pivot_row = best;

        frame({pivot_row: pivot_row, pivot_column: pivot_column, comment: "Pivot on $"+variable_names[pivot_column]+"$ and row "+(pivot_row+1)+".", ratios: ratios})

        var pivot = tableau[pivot_row][pivot_column];
        // make pivot row have a 1 in pivot column
        for(var i=0;i<=num_variables;i++) {
            tableau[pivot_row][i] = rdiv(tableau[pivot_row][i],pivot);
        }
        // make all other rows have a 0 in pivot column
        for(var i=0;i<tableau.length;i++) {
            if(i!=pivot_row) {
                var f = tableau[i][pivot_column];
                for(var j=0;j<=num_variables;j++) {
                    tableau[i][j] = rsub(tableau[i][j],rmul(f,tableau[pivot_row][j]));
                }
            }
        }

        frame({comment: "$"+(variable_names[pivot_column])+"$ is now basic."});
    }
    frame({complete:true, comment: "No $c_j - z_j$ is positive, so this tableau is optimal."});
    var basics = optimisation.simplex_find_basics(tableau);
    var out = basics.map(function(basic,i) {
        if(basic>=0) {
            var t = tableau[basic][num_variables];
            return t[0]/t[1];
        } else {
            return 0;
        }
    });
    var otableau = tableau.map(function(row) { return row.map(function(x){ return x[0]/x[1]; }) });
    otableau.rows = otableau.length;
    if(otableau.rows) {
        otableau.columns = otableau[0].length;
    }
    return {result: out, basics: basics, tableau: otableau, frames: frames};
}

optimisation.simplex_find_basics = function(tableau) {
    var num_variables = tableau[0].length;
    var basics = [];
    for(var i=0;i<num_variables;i++) {
        var one = null;
        var zeros = true;
        for(var j=0;j<tableau.length;j++) {
            var t = tableau[j][i];
            var n = typeof(t)=='number' ? t : t[0]/t[1];
            if(one===null && n==1) {
                one = j;
            } else if(n!=0) {
                zeros = false;
                break;
            }
        }
        basics[i] = zeros && one!==null ? one : -1;
    }
    return basics;
}

function rationalNumber(f) {
    var out;
    if(f[1]==0) {
        return 'N/A';
    } else if(f[1]==1) {
        out = Math.abs(f[0]).toString();
    } else {
        out = Math.abs(f[0])+'/'+f[1];
    }
    if(f[0]<0)
        out='-'+out;

    return out;
}

optimisation.simplex_display = function(frames) {
    var div = $('<div class="optimisation-display"/>');
    var frame_htmls = frames.map(function(frame) {
        var frame_html = $('<div class="frame"/>');
        div.append(frame_html);

        var table = optimisation.simplex_display_tableau(frame);
        frame_html.append(table);

        if(frame.comment) {
            frame_html.append($('<p/>').html(frame.comment));
        }
    });
    return div;
}

optimisation.simplex_display_tableau = function(frame) {
    var table = $('<table class="optimisation-table simplex"><thead></thead><tbody></tbody></table>');
    var tr = $('<tr/>');
    tr.append('<td colspan="3"/>');
    frame.objective.map(function(v) {
        tr.append($('<td/>').text(rationalNumber(v)));
    });
    table.find('thead').append(tr);
    var tr = $('<tr/>');
    tr.append('<th>$c_j$</th>');
    tr.append('<th class="basics">Basic variables</th>');
    tr.append('<th class="rhs">Quantity</th>');
    for(var i=0;i<frame.tableau[0].length-1;i++) {
        var th = $('<th/>').html('$'+frame.variable_names[i]+'$')
        tr.append(th);
    }
    if(frame.ratios) {
        tr.append('<th class="ratio">Ratio</th>');
    }
    table.find('thead').append(tr);
    frame.tableau.forEach(function(row,i) {
        var is_objective = i==frame.tableau.length-1;
        var tr = $('<tr/>');
        var basics = [];
        frame.basics.forEach(function(b,j) {
            if(b==i) {
                basics.push(j);
            }
        });
        var td_cj = $('<td class="cj"/>');
        tr.append(td_cj);
        var td_values = $('<td class="basics"/>');
        tr.append(td_values);
        if(!is_objective) {
            td_values.html('$'+basics.map(function(x){return frame.variable_names[x]}).join(',')+'$')
            td_cj.html(basics.map(function(x){return rationalNumber(frame.objective[x])}).join(','));
        } else {
            td_values.html('$c_j - z_j$');
        }

        var td_rhs = $('<td class="rhs">');
        tr.append(td_rhs);
        if(!is_objective) {
            td_rhs.text(rationalNumber(row[row.length-1]));
        }

        function show_value(x,j) {
            var td = $('<td/>');
            if(!is_objective) {
                td.text(rationalNumber(x));
            } else {
                td.text(rationalNumber([-x[0],x[1]]));
            }
            if(i==frame.pivot_row) {
                td.addClass('pivot-row');
            }
            if(j==frame.pivot_column) {
                td.addClass('pivot-column');
            }
            if(frame.complete && x[0]==1 && x[1]==1) {
                td.addClass('solution');
            }
            tr.append(td);
        }
        row.slice(0,row.length-1).forEach(show_value);
        if(frame.ratios && !is_objective) {
            var td = $('<td class="ratio"/>').text(rationalNumber(frame.ratios[i]));
            if(i==frame.pivot_row) {
                td.addClass('pivot-row');
            }
            tr.append(td);
        }
        table.find('tbody').append(tr);

        if(is_objective) {
            var z = row.slice(0,row.length-1).map(function(v,j) {
                return rsub(rsub([0,1],frame.objective[j]),v);
            });
            var otr = tr;
            var tr = $('<tr class="objective"><td class="cj"></td><td class="basics">$z_j$</td></tr>');
            tr.append($('<td class="rhs">').text(rationalNumber(row[row.length-1])));
            z.forEach(show_value);
            otr.before(tr);
        }
    });

    return table;
}

/* Reduce a system of linear equations to row-echelon form
 */
optimisation.reduced_row_echelon_form = function(system) {
    var matrix = Numbas.util.copyarray(system,true);
    var rows = matrix.length;
    var columns = matrix[0].length;

    var current_row = 0;
    // for each column, there should be at most one row with a 1 in that column, and every other row should have 0 in that column
    for(var leader_column=0;leader_column<columns;leader_column++) {
        // find the first row with a non-zero in that column
        for(var row=current_row;row<rows;row++) {
            if(matrix[row][leader_column]!=0) {
                break;
            }
        }
        // if we found a row with a non-zero in the leader column 
        if(row<rows) {
            // swap that row with the <leader_column>th one
            if(row!=current_row) {
                var tmp = matrix[row];
                matrix[row] = matrix[current_row];
                matrix[current_row] = tmp;
            }

            // multiply this row so the leader column has a 1 in it
            matrix[current_row] = matrix[current_row].map(function(v){return v/matrix[current_row][leader_column]});

            // subtract multiples of this row from every other row so they all have a 0 in this column
            for(var row=0;row<rows;row++) {
                if(row!=current_row) {
                    var original = matrix[row];
                    matrix[row] = matrix[row].map(function(v,i){ return v-matrix[current_row][i]*matrix[row][leader_column] });
                }
            }
            current_row += 1;
        }
    }
    
    return matrix;
}

optimisation.systems_of_equations_equivalent = function(s1,s2) {
    if(s1.length!=s2.length || s1[0].length!=s2[0].length) {
        return false;
    }
    var r1 = optimisation.reduced_row_echelon_form(s1);
    var r2 = optimisation.reduced_row_echelon_form(s2);
    show(r1);
    show(r2);

    for(var i=0;i<r1.length;i++) {
        for(var j=0;j<r1[i].length;j++) {
            if(Math.abs(r1[i][j]-r2[i][j])>1e-10) {
                return false;
            }
        }
    }

    return true;
}

optimisation.convex_hull = function(points) {
  var min_x = Infinity;
  var max_x = -Infinity;
  var left,right;
  points.forEach(function(p){ 
    if(p[0]<min_x) {
      min_x = p[0];
      left = p;
    }
    if(p[0]>max_x) {
      max_x = p[0];
      right = p;
    }
  })
  var above = convex_hull_line(left,right,points);
  var below = convex_hull_line(right,left,points)
  return [left].concat(above,[right],below);
}
function convex_hull_line(left,right,points) {
  var dx = right[0]-left[0];
  var dy = right[1]-left[1];
  var m = -dy/dx;
  
  var max_d = -Infinity;
  var top = null;
  var above = [];
  var below = [];
  points.forEach(function(p) {
    var d = -dy*(p[0]-left[0])+dx*(p[1]-left[1]);
    if(d>0) {
      above.push(p);
      if(d>max_d) {
        max_d = d
        top = p;
      }
    }
    if(d<0) {
      below.push(p);
    }
  })
  
  if(top==right) {
    throw(new Error("Eep"));
  }
  
  if(top) {
    var lt = convex_hull_line(left,top,above);
    var tr = convex_hull_line(top,right,above);
    return lt.concat([top],tr);
  } else {
    return [];
  }
}

optimisation.job_cost_table = function(costs,worker_name,job_name) {
    var num_workers = costs.rows;
    var num_jobs = costs.columns;
    var table = $('<table class="optimisation-table job-costs"><thead><tr><td colspan="2"><th colspan="'+num_jobs+'">'+job_name+'</th></tr></thead><tbody></tbody><tfoot></tfoot></table>');
    var top_tr = $('<tr><td colspan="2"/></tr>');
    for(var i=0;i<num_jobs;i++) {
      top_tr.append($('<th/>').text(i+1));
    }
    table.find('thead').append(top_tr);
    for(var i=0;i<num_workers;i++) {
      var tr = $('<tr/>');
      if(i==0) {
        tr.append($('<th></th>').text(worker_name).attr('rowspan',num_workers));
      }
      tr.append($('<th/>').text(i+1));
      for(var j=0;j<num_jobs;j++) {
        tr.append($('<td/>').text(costs[i][j]));
      }
      table.find('tbody').append(tr);
    }

    return table;
}

var star = "star", prime = "prime", nomask = '';
optimisation.hungarian = function(costs) {

    var frames = [];
    function frame(extra) {
        var data = {
            grid: grid,
            row_covered: row_covered,
            column_covered: column_covered,
            star_rows: star_rows,
            star_columns: star_columns,
            mask: mask
        }
        frames.push(makeFrame(data,extra));
    }

    var grid = Numbas.util.copyarray(costs,true);

    var n = grid.length;
    var i,j;

    var star_rows = [];
    var star_columns = [];
    var row_covered = [];
    var column_covered = [];
    var mask = [];
    var found_prime;
    for(i=0;i<n;i++) {
        star_rows.push(0);
        star_columns.push(0);
        var row = [];
        for(j=0;j<n;j++) {
            row.push(nomask);
        }
        mask.push(row);
    }

    frame({message: "This is the initial matrix."});

    var step = 1;
    var steps = 0;
    while(step!=0 && steps<20) {
        steps += 1;

        switch(step) {
        case 1:
            // step 1 - remove minimum element from rows and columns
            for(i=0;i<n;i++) {
                var min = Infinity;
                for(j=0;j<n;j++) {
                    min = Math.min(min,grid[i][j]);
                }
                for(j=0;j<n;j++) {
                    grid[i][j] -= min;
                }
            }
            frame({message: "1a. Subtract the smallest element from each row."});
            for(j=0;j<n;j++) {
                var min = Infinity;
                for(i=0;i<n;i++) {
                    min = Math.min(min,grid[i][j]);
                }
                for(i=0;i<n;i++) {
                    grid[i][j] -= min;
                }
            }
            frame({message: "1b. Subtract the smallest element from each column."});
            step = 2;
            break;
        case 2:
            // step 2 - star zeros
            for(i=0;i<n;i++) {
                for(j=0;j<n;j++) {
                    if(grid[i][j]==0 && star_rows[i]===0 && star_columns[j]===0) {
                        star_rows[i] += 1;
                        star_columns[j] += 1;
                        mask[i][j] = star;
                        //frame({message: "2. There is a zero at $("+i+","+j+")$. There is no starred zero in its row or column, so star $("+i+","+j+")$."});
                    }
                }
            }
            step = 3;
            break;
        case 3:
            // step 3 - cover columns with starred zeros
            var covered_column_count = 0;
            var changed = false;
            for(i=0;i<n;i++) {
                if(star_columns[i]!==0) {
                    if(!column_covered[i]) {
                        changed = true;
                    }
                    column_covered[i] = true;
                }
                covered_column_count += column_covered[i] ? 1 : 0;
            }
            
            if(changed) {
            //    frame({message: "3. Cover each column containing a starred zero."});
            }

            if(covered_column_count==n) {
                step = 0;
            } else {
                step = 4;
            }
            break;
        case 4:
            // step 4 - find an uncovered zero
            function find_zero() {
                for(j=0;j<n;j++) {
                    for(i=0;i<n;i++) {
                        if(grid[i][j]==0 && !(column_covered[j] || row_covered[i])) {
                            mask[i][j] = prime;
                            if(star_rows[i]===0) {
                                step = 5;
                                //frame({message:"4. There is an uncovered zero at $("+i+","+j+")$; prime it. There is no starred zero in the row containing this primed zero."});
                                found_prime = {i:i,j:j};
                                done = true;
                                return;
                            } else {
                                for(j=0;j<n;j++) {
                                    if(mask[i][j]==star) {
                                        break;
                                    }
                                }
                                row_covered[i] = true;
                                column_covered[j] = false;
                                //frame({message: "4. There is an uncovered zero at $("+i+","+j+")$; prime it. Uncover column "+j+" and cover row "+i});
                                return;
                            }
                        }
                    }
                }
                done = true;
            }

            var done = false;
            while(!done) {
                find_zero();
            }
            if(step==4) {
                step = 6;
            }
            break;
        case 5:
            i = found_prime.i;
            j = found_prime.j;

            var path = [];
            path.push(found_prime);
            while(star_columns[j]) {
                for(var si=0;si<n;si++) {
                    if(mask[si][j]==star) {
                        break;
                    }
                }
                path.push({i:si,j:j});
                for(j=0;j<n;j++) {
                    if(mask[si][j]==prime) {
                        break;
                    }
                }
                path.push({i:si,j:j});
            }
            
            path.map(function(cell,i) {
                if(i%2) { // star
                    mask[cell.i][cell.j] = nomask;
                    star_rows[cell.i] -= 1;
                    star_columns[cell.j] -= 1;
                } else { // prime
                    mask[cell.i][cell.j] = star;
                    star_rows[cell.i] += 1;
                    star_columns[cell.j] += 1;
                }
            });
            //frame({message: "5. Construct a path of alternating primed and starred zeros: find a starred zero in the same column as the primed zero, and a primed zero in the same row as the starred zero. Remove stars, and convert primes to stars."});

            for(i=0;i<n;i++) {
                row_covered[i] = false;
                column_covered[i] = false;
                for(j=0;j<n;j++) {
                    if(mask[i][j]==prime) {
                        mask[i][j] = nomask;
                    }
                }
            }
            //frame({message: "5. Remove all primes and uncover every line in the matrix."});

            step = 3;
            break;
        case 6:
            frame({show_covers: false, message: "2. Find a zero with no other zeros in its row or column. Circle it, and strike out zeros in the same column or row. Repeat for each zero in the matrix."});
            frame({message: "3. One or more rows or columns do not contain a circled zero, so we do not yet have an optimal solution."+
                            "Cover the matrix with the fewest horizontal or vertical lines, so that every zero is covered by a line."
            });

            var least = Infinity;
            for(i=0;i<n;i++) {
                if(!row_covered[i]) {
                    for(j=0;j<n;j++) {
                        if(!column_covered[j]) {
                            least = Math.min(least,grid[i][j]);
                        }
                    }
                }
            }
            for(i=0;i<n;i++) {
                if(row_covered[i]) {
                    for(j=0;j<n;j++) {
                        grid[i][j] += least;
                    }
                }
                if(!column_covered[i]) {
                    for(j=0;j<n;j++) {
                        grid[j][i] -= least;
                    }
                }
            }
            //frame({message: "6. Add the value found in Step 4 to every element of each covered row, and subtract it from every element of each uncovered column."});
            frame({message: "4. The minimum uncovered element is "+least+". Subtract this from every uncovered element, and add it to every element on the intersection of two lines. Go back to step 2."});

            step = 4;
            break;
        }
    }

    frame({show_covers: false, message: 
            "2. Find a zero with no other zeros in its row or column. Circle it, and strike out zeros in the same column or row. Repeat for each zero in the matrix. "+
            "Each column and row contains a circled zero, so we have found an optimal solution."
    });

    var assignments = [];
    var cost = 0;
    for(i=0;i<n;i++) {
        for(j=0;j<n;j++) {
            if(mask[i][j]==star) {
                assignments.push([i,j]);
                cost += costs[i][j];
            }
        }
    }
    return {result: assignments, frames: frames};
}

optimisation.hungarian_display = function(frames) {
    var div = $('<div class="optimisation-display"/>');
    var frame_htmls = frames.map(function(frame) {
        var frame_div = $('<div class="frame"/>');
        div.append(frame_div);

        frame_div.append($('<p/>').html(frame.message));

        var table = $('<table class="optimisation-table hungarian"><thead></thead><tbody></tbody></table>');
        frame_div.append(table);

        var n = frame.grid.length;
        if(frame.show_covers!==false) {
            for(var i=0;i<n;i++) {
                if(frame.row_covered[i]) {
                    table.append($('<span class="row-covered"/>').css('top',(i*2+1)+'em'));
                }
                if(frame.column_covered[i]) {
                    table.append($('<span class="column-covered"/>').css('left',(i*2+1)+'em'));
                }
            }
        }

        frame.grid.forEach(function(row,i) {
            var tr = $('<tr/>');
            table.find('tbody').append(tr);
            row.forEach(function(x,j) {
                var td = $('<td/>').append($('<span class="element"/>').text(x));
                if(frame.show_covers!==false && (frame.row_covered[i] || frame.column_covered[j])) {
                    td.addClass('covered');
                }
                if(frame.mask[i][j]==star) {
                    td.addClass('star');
                } else if(frame.grid[i][j]==0 && (frame.row_covered[i] || frame.column_covered[j]) && (frame.star_rows[i] || frame.star_columns[j])) {
                    td.addClass('strike');
                }
                tr.append(td);
            });
        });

    });
    
    return div;
}

function getMouseCoords(board,e, i) {
    var cPos = board.getCoordsTopLeftCorner(e, i),
            absPos = JXG.getPosition(e, i),
            dx = absPos[0]-cPos[0],
            dy = absPos[1]-cPos[1];

    var coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
    return coords.usrCoords;
}

/** Create a diagram of a linear programming problem
 * Options object takes the following format:
 *    [x_bound,y_bound]: top-right boundary of diagram
 *    objective_line_coordinates: coordinates of the objective line
 *    minimum_x, minimum_y: minimum values for X and Y (left and bottom boundaries of the feasible region)
 *    inequality_1_coordinates, inequality_2_coordinates: coordinates of the two lines representing the inequalities
 *    inequality_1_ok, inequality_2_ok: functions or booleans saying whether the inequality lines can be drawn
 */
optimisation.linear_programming_board = function(options) {
    var scale_x = options.x_bound/600;
    var scale_y = options.y_bound/400
    var div = Numbas.extensions.jsxgraph.makeBoard('600px','400px',{
        boundingBox:[-20*scale_x,options.y_bound+20*scale_y,options.x_bound+10*scale_x,-20*scale_y],
        axis: true,
    });
    var board = div.board;

    var out = {
        div: div,
        board: board
    }

    if(options.coord_point) {
        var coord_point = out.coord_point = board.create('text',[0,0,'a'], {highlight: false});
        board.on('mousemove',function(e) {
                var coords = getMouseCoords(board,e);
                coord_point.setCoords([coords[1]+5*scale_x,coords[2]]);

                function niceNumber(n) {
                    return Numbas.math.niceNumber(n,{precisionType:'sigfig',precision:3})
                }

                var text = '('+niceNumber(coords[1])+', '+niceNumber(coords[2])+')';
                coord_point.setText(text);
                coord_point.setAttribute({visible:true});
                board.update();
        });
        $(div).on('mouseout',function(e) {
                coord_point.setAttribute({visible:false});
                board.update();
        });
    }

    var objective_line = out.objective_line = board.create('line',options.objective_line_coordinates,{name: 'Profit', strokeColor: 'green', dash: 1, withLabel: false, highlight: false});

    var minimum_x = options.minimum_x;
    var minimum_y = options.minimum_y;

    var x_constraint_line = out.x_constraint_line = board.create('line',[[minimum_x,0],[minimum_x,1]], {strokeColor:'red',fixed:true, highlight: false, fixed: true});
    var y_constraint_line = out.y_constraint_line = board.create('line',[[0,minimum_y],[1,minimum_y]], {strokeColor:'red',fixed:true, highlight: false, fixed: true});;
    var inequality_line_1 = out.inequality_line_1 = board.create('line',options.inequality_1_coordinates, {withLabel: false, highlight: false, fixed: true});
    var inequality_line_2 = out.inequality_line_2 = board.create('line',options.inequality_2_coordinates, {withLabel: false, highlight: false, fixed: true});

    var inequality_intersection = out.inequality_intersection = board.create('intersection',[inequality_line_1,inequality_line_2] ,{visible:false, withLabel: false, highlight: false, fixed: true});
    var minimum_point = out.minimum_point = board.create('intersection', [x_constraint_line,y_constraint_line], {visible:false, withLabel: false, highlight: false, fixed: true});
    var inequality_1_bottom = out.inequality_1_bottom = board.create('intersection',[inequality_line_1,y_constraint_line], {visible:false, withLabel: false, highlight: false, fixed: true});
    var inequality_2_bottom = out.inequality_2_bottom = board.create('intersection',[inequality_line_2,y_constraint_line], {visible:false, withLabel: false, highlight: false, fixed: true});
    var inequality_1_left = out.inequality_1_left = board.create('intersection',[x_constraint_line,inequality_line_1], {visible:false, withLabel: false, highlight: false, fixed: true});
    var inequality_2_left = out.inequality_2_left = board.create('intersection',[x_constraint_line,inequality_line_2], {visible:false, withLabel: false, highlight: false, fixed: true});

    var feasible_regions = out.feasible_regions = [
        [minimum_point,inequality_1_bottom,inequality_1_left],    
        [minimum_point,inequality_1_bottom,inequality_intersection,inequality_2_left],
        [minimum_point,inequality_2_bottom,inequality_intersection,inequality_1_left],
        [minimum_point,inequality_2_bottom,inequality_2_left]
    ].map(function(points,i) {
        return board.create('polygon',points, {name:"Feasible Region",visible:false, withLabel: false, 'fillOpacity': 0.3});
    });

    function unwrap(v) {
        if(typeof(v)=='function') {
            return v();
        } else {
            return v;
        }
    }

    function rework() { 
        var inequality_1_ok = options.inequality_1_ok!==undefined ? unwrap(options.inequality_1_ok) : true;
        var inequality_2_ok = options.inequality_2_ok!==undefined ? unwrap(options.inequality_2_ok) : true;

        var consxOK = !isNaN(unwrap(minimum_x));
        var consyOK = !isNaN(unwrap(minimum_y));
        
        board.update();

        var te = inequality_1_bottom.X() > inequality_2_bottom.X();
        var te1 = inequality_1_left.Y() > inequality_2_left.Y();

        board.update();

        x_constraint_line.setAttribute({'visible': consxOK});
        y_constraint_line.setAttribute({'visible': consyOK});        
        inequality_line_1.setAttribute({'visible': inequality_1_ok});
        inequality_line_2.setAttribute({'visible': inequality_2_ok});

        var feasible_region_visible = consxOK && consyOK && inequality_1_ok && inequality_2_ok;
        var region_to_show = 2*te + te1;
        feasible_regions.forEach(function(polygon,i) {
            polygon.setAttribute({'visible':feasible_region_visible && i==region_to_show});
        });

        board.update();        
    }

    x_constraint_line.on('drag',rework);
    y_constraint_line.on('drag',rework);
    inequality_line_1.on('drag',rework);
    inequality_line_2.on('drag',rework);

    ko.computed(rework); 

    return out;
}

/* Solve a linear program with minimum constraints for each product, maximum constraints for each resource, numbers of each resource used in each product, and a straight line objective function
 * minimum_x, minimum_y: minimum allocations for each product
 * resources_x, resources_y: numbers of each resource used to make 1 unit of each product
 * max_resource_1, max_resource_2: available quantities of each resource
 * profit_x, profit_y: profit per unit of each product
 *
 * Looks at the following intersection points:
 * 0 - resource 1 with minimum x
 * 1 - resource 2 with minimum x
 * 2 - resource 1 with minimum y
 * 3 - resource 2 with minimum y
 * 4 - resource 1 with resource 2
 *
 * Returns:
 * best_point: [x,y] coordinates of the point in the feasible region giving maximum profit
 * best_profit: profit at best_point
 * possible_points: intersections of constraints which lie in the feasible region
 * binding_lines: array of booleans specifying which lines are binding (touching the optimal solution) - [resource 1, resource 2, minimum x, minimum y]
 */
optimisation.solve_linear_program = function(program) {
    var minimum_x = program[0],
        minimum_y = program[1],
        resources_x = program[2],
        resources_y = program[3],
        max_resource_1 = program[4],
        max_resource_2 = program[5],
        profit_x = program[6],
        profit_y = program[7];

    var y = (max_resource_1-max_resource_2*resources_x[0]/resources_x[1])/(resources_y[0] - resources_x[0]/resources_x[1] * resources_y[1]);
    var intersection_points = [
        [minimum_x, (max_resource_1-resources_x[0]*minimum_x)/resources_y[0]],    //resource 1 intersecting with minimum x
        [minimum_x, (max_resource_2-resources_x[1]*minimum_x)/resources_y[1]],    //resource 2 intersecting with minimum x
        [(max_resource_1-resources_y[0]*minimum_y)/resources_x[0], minimum_y],    //resource 1 intersecting with minimum y
        [(max_resource_2-resources_y[1]*minimum_y)/resources_x[1], minimum_y],    //resource 2 intersecting with minimum y
        [(max_resource_1-resources_y[0]*y)/resources_x[0], y]    // intersection of the two resource constraints
    ];
    var possible_points = [];
    var tol = 0.00001;
    intersection_points.forEach(function(p,i) {
        var x = p[0];
        var y = p[1];
        if(x-minimum_x >= -tol && y-minimum_y >= -tol && x*resources_x[0] + y*resources_y[0] - max_resource_1 <= tol && x*resources_x[1] + y*resources_y[1] - max_resource_2 <= tol) {
            possible_points.push(i);
        }
    });
    function profit(p) {
        return profit_x*p[0] + profit_y*p[1];
    }
    possible_points.sort(function(i1,i2) {
        var p1 = intersection_points[i1];
        var p2 = intersection_points[i2];
        var a = profit(p1);
        var b = profit(p2);
        return a < b ? 1 : a > b ? -1 : 0;
    });

    var best_point = possible_points[0];

    var binding_lines = [
        [true,false,true,false],
        [false,true,true,false],
        [true,false,false,true],
        [false,true,false,true],
        [true,true,false,false]
    ][best_point];
    
    return {
        best_point: best_point,
        best_coords: intersection_points[best_point],
        profits: intersection_points.map(profit),
        best_profit: profit(intersection_points[best_point]),
        possible_points: possible_points,
        binding_lines: binding_lines
    }
}

optimisation.random_partition = function(total,n,min) {
    var props = [];
    var t = 0;
    min = min || 1;

    // generate n random numbers
    for(var i=0;i<n;i++) {
        var r = Math.random();
        t += r;
        props.push(r);
    }

    // scale so the allocations sum to total, but don't fill in the last item
    var t2 = 0;
    for(var i=0;i<n-1;i++) {
        var p = Numbas.math.round(total*props[i]/t);
        p = Math.max(p,min);  // allocate at least min
        props[i] = p;
        t2 += p;
    }

    // if the total excluding the last item is >= the total+min, need to subtract from preceding cells until we can allocate min to the last cell
    if(min>0 && n>1 && t2>=total+min) {
        if(n==2) {
            props[0] -= min;
            props[1] = min;
            return props;
        } else {
            var j = n-2;
            while(j>0 && t2>=total+min) {
                var diff = t2-(total-min);
                var c = Math.min(props[j]-min,diff);
                props[j] -= c;
                t2 -= c;
                j -= 1;
            }
        }
    }
    props[n-1] = total - t2;
    return props;
}

optimisation.utility_set = function(utility,labels) {
    var maxx = 0, maxy = 0;
    for(var i=0;i<utility.rows;i++) {
        maxx = Math.max(utility[i][0],maxx);
        maxy = Math.max(utility[i][1],maxy);
    }

    var scale_x = maxx/600;
    var scale_y = maxy/400
    var div = Numbas.extensions.jsxgraph.makeBoard('600px','400px',{
        boundingBox:[-20*scale_x,maxy+50*scale_y,maxx+80*scale_x,-20*scale_y],
        axis: true,
    });
    var board = div.board;

    for(var i=0;i<utility.rows;i++) {
        var pos = utility[i];
        var line_options = {fixed: true, visible: false, dash:2, highlight: false, opacity: 1, color: '#888'};
        var hline = board.create('line',[pos,[pos[0]+1,pos[1]]],line_options);
        var vline = board.create('line',[pos,[pos[0],pos[1]+1]],line_options);
        var p = board.create('point',utility[i], {fixed: true, highlight: false, name: labels[i]});

        (function(p,hline,vline) {
         p.on('over',function() {
             hline.showElement();
             vline.showElement();
             board.update();
             });
         p.on('out',function() {
             hline.hideElement();
             vline.hideElement();
             board.update();
             });
         })(p,hline,vline);
    }

    return div;
}

optimisation.show_expected_value_criteria = function(utility,labels,prob_state_1,prob_state_2) {
    var maxx = 0, maxy = 0;
    for(var i=0;i<utility.rows;i++) {
        maxx = Math.max(utility[i][0],maxx);
        maxy = Math.max(utility[i][1],maxy);
    }

    var scale_x = maxx/600;
    var scale_y = maxy/400
    var div = Numbas.extensions.jsxgraph.makeBoard('600px','400px',{
        boundingBox:[-20*scale_x,maxy+50*scale_y,maxx+80*scale_x,-20*scale_y],
        axis: true,
    });
    var board = div.board;

    var max_utility = 0;
    for(var i=0;i<utility.rows;i++) {
        var pos = utility[i];
        var line_options = {fixed: true, visible: false, dash:2, highlight: false, opacity: 1, color: '#888'};
        var hline = board.create('line',[pos,[pos[0]+1,pos[1]]],line_options);
        var vline = board.create('line',[pos,[pos[0],pos[1]+1]],line_options);
        var p = board.create('point',utility[i], {fixed: true, highlight: false, name: labels[i]});
        var u = prob_state_1*pos[0] + prob_state_2*pos[1];
        max_utility = Math.max(max_utility,u);

        (function(p,hline,vline) {
         p.on('over',function() {
             hline.showElement();
             vline.showElement();
             board.update();
             });
         p.on('out',function() {
             hline.hideElement();
             vline.hideElement();
             board.update();
             });
         })(p,hline,vline);
    }

    board.create('line',[-max_utility,prob_state_1,prob_state_2], {dash: 2});

    return div;
}

optimisation.evpi = function(utility,probabilities) {
    var num_states = utility.columns;
    var num_actions = utility.rows;
    var total_over_states = 0;
    for(var j=0;j<num_states;j++) {
        var m = 0;
        for(var i=0;i<num_actions;i++) {
            m = Math.max(utility[i][j],m);
        }
        total_over_states += probabilities[j]*m;
    }

    var max_over_actions = 0;
    for(var i=0;i<num_actions;i++) {
        var t = 0;
        for(var j=0;j<num_states;j++) {
            t += probabilities[j]*utility[i][j];
        }
        max_over_actions = Math.max(max_over_actions,t);
    }

    return total_over_states - max_over_actions;
}

    var jme = Numbas.jme;
    var unwrapValue = jme.unwrapValue;
    var funcObj = jme.funcObj;
    var types = jme.types;
    var scope = optimisation.scope;
    var TList = types.TList;
    var TNum = types.TNum;
    var THTML = types.THTML;
    var TBool = types.TBool;
    var TMatrix = types.TMatrix;
    var TString = types.TString;
    var TVector = types.TVector;

    scope.addFunction(new funcObj('random_partition',[TNum,TNum],TList,optimisation.random_partition,{unwrapValues: true}));
    scope.addFunction(new funcObj('random_partition',[TNum,TNum,TNum],TList,optimisation.random_partition,{unwrapValues: true}));

    scope.addFunction(new funcObj('best_point',[TList],TNum,function(program) {
        var result = optimisation.solve_linear_program(program);
        return result.best_point;
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('best_coords',[TList],TList,function(program) {
        var result = optimisation.solve_linear_program(program);
        return result.best_coords;
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('binding_lines',[TList],TList,function(program) {
        var result = optimisation.solve_linear_program(program);
        return result.binding_lines;
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('nw_corner',[TList,TList],TMatrix,function(supplies,demands) {
        var result = optimisation.nw_corner(supplies,demands);
        return new TMatrix(result.result);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('nw_corner_display',[TList,TList],THTML,function(supplies,demands) {
        var result = optimisation.nw_corner(supplies,demands);
        return new THTML(optimisation.nw_corner_display(result.frames));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('minimum_cost',[TList,TList,TMatrix],TMatrix,function(supplies,demands,costs) {
        var result = optimisation.minimum_cost(supplies,demands,costs);
        return new TMatrix(result.result);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('minimum_cost_display',[TList,TList,TMatrix],THTML,function(supplies,demands,costs) {
        var result = optimisation.minimum_cost(supplies,demands,costs);
        return new THTML(optimisation.minimum_cost_display(result.frames));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('valid_minimum_cost_allocation',[TList,TList,TList,TMatrix],TBool,function(supplies,demands,costs,allocation) {
        return new TBool(optimisation.valid_minimum_cost_allocation(supplies,demands,costs,allocation));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('shadow_costs',[TMatrix,TList,TMatrix],TList,function(assignments,allocated,costs) {
        var result = optimisation.shadow_costs(assignments,allocated,costs);
        return [new TMatrix(result.shadow_costs),result.rows,result.columns];
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('assignment_is_optimal',[TMatrix,TMatrix],TBool,function(assignments,costs) {
        try {
            var allocated = optimisation.allocations(assignments);
        } catch(e) {
            return false;
        }
        return optimisation.assignment_is_optimal(assignments,allocated,costs);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('assignment_is_valid',[TMatrix,TList,TList],TBool,function(assignments,supplies,demands) {
        return optimisation.assignment_is_valid(assignments,supplies,demands);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('stepping_stone_works',[TMatrix,TMatrix],TBool,function(assignments,costs) {
        try {
            var result = optimisation.stepping_stone(assignments,costs);
        } catch(e) {
            return false;
        }
        return true;
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('stepping_stone',[TMatrix,TMatrix],TMatrix,function(assignments,costs) {
        try {
            var result = optimisation.stepping_stone(assignments,costs);
        } catch(e) {
            return new TMatrix(assignments);
        }
        return new TMatrix(result.result);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('stepping_stone_display',[TMatrix,TMatrix],THTML,function(assignments,costs) {
        var result = optimisation.stepping_stone(assignments,costs);
        return new THTML(optimisation.stepping_stone_display(result.frames));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('assignment_cost',[TMatrix,TMatrix],TNum,function(assignments,costs) {
        return optimisation.assignment_cost(assignments,costs);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('cost_table',[TList,TList,TMatrix],THTML,function(supply,demand,costs) {
        return new THTML(optimisation.cost_table(supply,demand,costs));
    },{unwrapValues: true}))

    scope.addFunction(new funcObj('assignment_table',[TMatrix,TList,TList],THTML,function(assignments,supply,demand) {
        return new THTML(optimisation.assignment_table(assignments,supply,demand));
    },{unwrapValues: true}))

    scope.addFunction(new funcObj('show_cost_calculation',[TMatrix,TMatrix],TString,function(assignments,costs) {
        return optimisation.show_cost_calculation(assignments,costs);
    },{unwrapValue: true, latex: true}));

    scope.addFunction(new funcObj('job_cost_table',[TMatrix,TString,TString],THTML,function(costs,worker_name,job_name) {
        return new THTML(optimisation.job_cost_table(costs,worker_name,job_name));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('hungarian',[TMatrix],TMatrix,function(costs) {
        var res = optimisation.hungarian(costs);
        var out = [];
        for(var i=0;i<costs.rows;i++) {
            var row = [];
            for(var j=0;j<costs.columns;j++) {
                row.push(0);
            }
            out.push(row);
        }
        res.result.forEach(function(p) {
            out[p[0]][p[1]] = 1;
        });
        out.rows = costs.rows;
        out.columns = costs.columns;
        return new TMatrix(out);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('hungarian_display',[TMatrix],THTML,function(costs) {
        var res = optimisation.hungarian(costs);
        return new THTML(optimisation.hungarian_display(res.frames));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('utility_set',[TMatrix,TList],THTML,function(utility,labels) {
        return new THTML(optimisation.utility_set(utility,labels));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('show_expected_value_criteria',[TMatrix,TList,TNum,TNum],THTML,function(utility,labels,prob_state_1,prob_state_2) {
        return new THTML(optimisation.show_expected_value_criteria(utility,labels,prob_state_1,prob_state_2));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('evpi',[TMatrix,TList],TNum,optimisation.evpi,{unwrapValues: true}));
    scope.addFunction(new funcObj('evpi',[TMatrix,TVector],TNum,optimisation.evpi,{unwrapValues: true}));

    scope.addFunction(new funcObj('simplex',[TList,TList],TList,function(objective,equations) {
        var res = optimisation.simplex(objective,equations);
        return res.result;
    },{unwrapValues: true}));
    scope.addFunction(new funcObj('simplex_optimal_tableau',[TList,TList],TMatrix,function(objective,equations) {
        var res = optimisation.simplex(objective,equations);
        return new TMatrix(res.tableau);
    },{unwrapValues: true}));
    scope.addFunction(new funcObj('simplex_find_basics',[TMatrix],TList,function(tableau) {
        return optimisation.simplex_find_basics(tableau)
    },{unwrapValues: true}));
    scope.addFunction(new funcObj('simplex_display',[TList,TList],THTML,function(objective,equations) {
        var res = optimisation.simplex(objective,equations);
        return new THTML(optimisation.simplex_display(res.frames));
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('simplex_final_tableau',[TList,TList],THTML,function(objective,equations) {
        var res = optimisation.simplex(objective,equations);
        var html = optimisation.simplex_display_tableau(res.frames[res.frames.length-1]);
        return new THTML(html);
    },{unwrapValues: true}));

    scope.addFunction(new funcObj('convex_hull',[TList],TList,function(points) {
        return optimisation.convex_hull(points);
    },{unwrapValues: true}));
});
