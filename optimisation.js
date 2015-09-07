Numbas.addExtension('optimisation',['util','jme'],function(optimisation) {

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
	return {result: out, frames: frames};
}

optimisation.nw_corner_display = function(frames) {
	var div = document.createElement('div');
	return frames.map(function(frame) {
		var table = $('<table class="optimisation-table nw-corner-tableau"><thead><tr><td></td></tr></thead><tbody></tbody></table>');
		for(var i=0;i<frame.demands.length;i++) {
			table.find('thead tr').append($('<th class="demand-label"/>').text(util.letterOrdinal(i).toUpperCase()));
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
		table.find('tbody').append(tr);
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
	cells.sort(function(a,b) {
		var ca = costs[a.s][a.d];
		var cb = costs[b.s][b.d];
		return ca>cb ? 1 : ca<cb ? -1 : 0;
	});

	frame();

	cells.forEach(function(c) {
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
	});

	return {result: out, frames: frames};
}

optimisation.minimum_cost_display = function(frames) {
	var div = $('<div/>');
	var frame_htmls = frames.map(function(frame) {
		var frame_div = $('<div/>');
		div.append(frame_div);

		var costs_table = $('<table class="optimisation-table minimum-cost-costs"><thead><tr><th>Costs</th></thead><tbody></tbody></table>');
		frame_div.append(costs_table);
		var tableau = $('<table class="optimisation-table minimum-cost-tableau"><thead><tr><td></td></tr></thead><tbody></tbody></table>');
		frame_div.append(tableau);

		for(var i=0;i<frame.demands.length;i++) {
			tableau.find('thead tr').append($('<th class="demand-label"/>').text(util.letterOrdinal(i).toUpperCase()));
			costs_table.find('thead tr').append($('<th class="demand-label"/>').text(util.letterOrdinal(i).toUpperCase()));
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
		tableau.find('tbody').append(tr);

		return frame_div;
	});
	return div;
}

optimisation.simplex = function(objective,equations) {
	var num_variables = objective.length;
	objective = objective.map(function(x){return -x});
	objective.push(0);
	var tableau = equations.slice();
	tableau.splice(0,0,objective);
	var steps = 0;
	while(steps<1000) {
		steps += 1;
		// if all coefficients in the top row are nonnegative, solution is optimal
		// otherwise, pick a column with negative value as the pivot
		var pivot_column = null;
		for(var i=0;i<tableau[0].length;i++) {
			if(tableau[0][i]<0) {
				pivot_column = i;
				break;
			}
		}
		if(pivot_column===null) {
			break;
		}

		// find pivot column
		for(var i=0;i<num_variables;i++) {
			if(tableau[0][i]<0) {
				break;
			}
		}
		var pivot_column = i;

		// find pivot row
		var min_ratio = null;
		var best = null;
		for(var i=0;i<tableau.length;i++) {
			var ratio = tableau[i][num_variables]/tableau[i][pivot_column];
			if(ratio>0 && (min_ratio===null || ratio<min_ratio)) {
				min_ratio = ratio;
				best = i;
			}
		}
		var pivot_row = best;

		var pivot = tableau[pivot_row][pivot_column];
		for(var i=0;i<=num_variables;i++) {
			tableau[pivot_row][i] /= pivot;
		}
		for(var i=0;i<tableau.length;i++) {
			if(i!=pivot_row) {
				var f = tableau[i][pivot_column];
				for(var j=0;j<=num_variables;j++) {
					tableau[i][j] -= f*tableau[pivot_row][j];
				}
			}
		}

	}
	var out = [];
	for(var i=0;i<num_variables;i++) {
		for(var j=0;j<tableau.length;j++) {
			if(tableau[j][i]==1) {
				out[i] = tableau[j][num_variables];
				break;
			}
			out[i] = 0;
		}
	}
	return out;
}

optimisation.hungarian = function(costs) {
	var grid = Numbas.util.copyarray(costs,true);

	var n = grid.length;
	var i,j;

	var star_rows = [];
	var star_columns = [];
	var row_covered = [];
	var column_covered = [];
	var mask = [];
	var star = "*", prime = "'", nomask = ' ';
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
	
	var step = 1;
	var steps = 0;
	while(step!=0 && steps<20) {
		steps += 1;
		switch(step) {
		case 1:
			// step 1 - find cheapest element in each row
			for(i=0;i<n;i++) {
				var lowest = null;
				for(j=0;j<n;j++) {
					if(lowest===null || grid[i][j]<lowest) {
						lowest = grid[i][j];
					}
				}
				for(var j=0;j<n;j++) {
					grid[i][j] -= lowest;
				}
			}
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
					}
				}
			}
			step = 3;
			break;
		case 3:
			// step 3 - cover columns with starred zeros
			var covered_column_count = 0;
			for(i=0;i<n;i++) {
				if(star_columns[i]!==0) {
					column_covered[i] = true;
				}
				covered_column_count += column_covered[i] ? 1 : 0;
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

			for(i=0;i<n;i++) {
				row_covered[i] = false;
				column_covered[i] = false;
				for(j=0;j<n;j++) {
					if(mask[i][j]==prime) {
						mask[i][j] = nomask;
					}
				}
			}

			step = 3;
			break;
		case 6:
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

			step = 4;
			break;
		}
	}

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
	return assignments;
}

});
