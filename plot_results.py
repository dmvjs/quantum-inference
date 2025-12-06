#!/usr/bin/env python3
"""
Plot benchmark results for quantum factoring paper.

Generates 4 key figures:
1. Success rate vs N (showing phase transition)
2. Success rate vs φ(N) divisor count (non-monotonic difficulty)
3. Time to factorization vs N
4. Smooth vs random strategy comparison (when random data available)
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

def load_data():
    """Load benchmark results from CSV."""
    return pd.read_csv('benchmark-results.csv')

def plot_success_vs_n(df, output_dir='plots'):
    """Plot success rate vs N, showing the phase transition."""
    Path(output_dir).mkdir(exist_ok=True)

    # Group by N and calculate success rate
    success_by_n = df.groupby('N').agg({
        'success': ['mean', 'std', 'count']
    }).reset_index()
    success_by_n.columns = ['N', 'success_rate', 'std', 'count']
    success_by_n['success_rate'] *= 100  # Convert to percentage
    success_by_n['std'] *= 100

    plt.figure(figsize=(10, 6))
    plt.errorbar(success_by_n['N'], success_by_n['success_rate'],
                 yerr=success_by_n['std'], fmt='o-', capsize=5,
                 label='Smooth basis (middle-out)', linewidth=2, markersize=6)

    plt.axhline(y=100, color='gray', linestyle='--', alpha=0.5, label='100% success')
    plt.axvline(x=900, color='red', linestyle='--', alpha=0.5, label='Hard limit (~900)')

    plt.xlabel('N (number to factor)', fontsize=12)
    plt.ylabel('Success Rate (%)', fontsize=12)
    plt.title('Success Rate vs N: Smooth Basis Selection\n(85% noise, T₂=5ms, 200k shots/base)', fontsize=14)
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)
    plt.ylim(-5, 105)

    plt.savefig(f'{output_dir}/success_vs_n.png', dpi=300, bbox_inches='tight')
    print(f"Saved: {output_dir}/success_vs_n.png")

def plot_success_vs_phi_divisors(df, output_dir='plots'):
    """Plot success rate vs φ(N) divisor count (non-monotonic difficulty)."""
    Path(output_dir).mkdir(exist_ok=True)

    # Calculate success rate by phi_divisors
    grouped = df.groupby('phi_divisors').agg({
        'success': 'mean',
        'N': 'mean'
    }).reset_index()
    grouped['success'] *= 100

    plt.figure(figsize=(10, 6))
    plt.scatter(grouped['phi_divisors'], grouped['success'],
                s=100, alpha=0.6, c=grouped['N'], cmap='viridis')
    cbar = plt.colorbar(label='N (number size)')

    plt.xlabel('Number of divisors of φ(N)', fontsize=12)
    plt.ylabel('Success Rate (%)', fontsize=12)
    plt.title('Non-Monotonic Difficulty: φ(N) Structure Matters More Than Size', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.ylim(-5, 105)

    # Add annotation for key insight
    plt.text(0.05, 0.95, 'Rich divisor structure\n→ easier factoring',
             transform=plt.gca().transAxes, fontsize=10,
             verticalalignment='top', bbox=dict(boxstyle='round',
             facecolor='wheat', alpha=0.5))

    plt.savefig(f'{output_dir}/success_vs_phi_divisors.png', dpi=300, bbox_inches='tight')
    print(f"Saved: {output_dir}/success_vs_phi_divisors.png")

def plot_time_vs_n(df, output_dir='plots'):
    """Plot time to factorization vs N."""
    Path(output_dir).mkdir(exist_ok=True)

    # Only successful trials
    success_df = df[df['success']].copy()
    success_df['time_s'] = success_df['time_ms'] / 1000

    grouped = success_df.groupby('N').agg({
        'time_s': ['mean', 'std']
    }).reset_index()
    grouped.columns = ['N', 'mean_time', 'std_time']

    plt.figure(figsize=(10, 6))
    plt.errorbar(grouped['N'], grouped['mean_time'],
                 yerr=grouped['std_time'], fmt='o-', capsize=5,
                 linewidth=2, markersize=6, label='Smooth basis')

    plt.xlabel('N (number to factor)', fontsize=12)
    plt.ylabel('Time to Factor (seconds)', fontsize=12)
    plt.title('Time to Factorization vs N', fontsize=14)
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)

    plt.savefig(f'{output_dir}/time_vs_n.png', dpi=300, bbox_inches='tight')
    print(f"Saved: {output_dir}/time_vs_n.png")

def plot_success_by_range(df, output_dir='plots'):
    """Plot success rate grouped by N ranges."""
    Path(output_dir).mkdir(exist_ok=True)

    # Define ranges
    bins = [0, 300, 500, 700, 900, 1200]
    labels = ['100-300', '300-500', '500-700', '700-900', '900-1200']
    df['range'] = pd.cut(df['N'], bins=bins, labels=labels)

    # Calculate success rate per range
    range_stats = df.groupby('range').agg({
        'success': ['mean', 'count']
    }).reset_index()
    range_stats.columns = ['range', 'success_rate', 'count']
    range_stats['success_rate'] *= 100

    plt.figure(figsize=(10, 6))
    bars = plt.bar(range_stats['range'], range_stats['success_rate'],
                   alpha=0.7, edgecolor='black')

    # Color bars by success rate
    for i, bar in enumerate(bars):
        rate = range_stats.iloc[i]['success_rate']
        if rate == 100:
            bar.set_color('green')
        elif rate > 50:
            bar.set_color('orange')
        else:
            bar.set_color('red')

    plt.xlabel('N Range', fontsize=12)
    plt.ylabel('Success Rate (%)', fontsize=12)
    plt.title('Success Rate by N Range', fontsize=14)
    plt.ylim(0, 105)
    plt.grid(True, alpha=0.3, axis='y')

    # Add count labels on bars
    for i, (idx, row) in enumerate(range_stats.iterrows()):
        plt.text(i, row['success_rate'] + 3,
                f"n={int(row['count'])}", ha='center', fontsize=10)

    plt.savefig(f'{output_dir}/success_by_range.png', dpi=300, bbox_inches='tight')
    print(f"Saved: {output_dir}/success_by_range.png")

def generate_summary_stats(df):
    """Print summary statistics for the paper."""
    print("\n" + "="*60)
    print("SUMMARY STATISTICS FOR PAPER")
    print("="*60)

    total_trials = len(df)
    total_success = df['success'].sum()
    overall_rate = total_success / total_trials * 100

    print(f"\nOverall:")
    print(f"  Trials: {total_trials}")
    print(f"  Successes: {total_success}")
    print(f"  Success rate: {overall_rate:.1f}%")

    # Success by N range
    bins = [0, 300, 500, 700, 900, 1200]
    labels = ['100-300', '300-500', '500-700', '700-900', '900-1200']
    df['range'] = pd.cut(df['N'], bins=bins, labels=labels)

    print(f"\nSuccess rate by range:")
    for label in labels:
        range_df = df[df['range'] == label]
        if len(range_df) > 0:
            rate = range_df['success'].mean() * 100
            count = len(range_df)
            successes = range_df['success'].sum()
            print(f"  N ∈ {label}: {successes}/{count} ({rate:.0f}%)")

    # Average time
    success_df = df[df['success']]
    avg_time = success_df['time_ms'].mean() / 1000
    print(f"\nAverage time to factor (successful): {avg_time:.1f}s")

    # Non-monotonic examples
    print(f"\nNon-monotonic difficulty examples:")
    for n in [437, 551]:
        n_df = df[df['N'] == n]
        if len(n_df) > 0:
            phi = n_df.iloc[0]['phi']
            phi_div = n_df.iloc[0]['phi_divisors']
            rate = n_df['success'].mean() * 100
            print(f"  N={n}: φ={phi}, {phi_div} divisors, {rate:.0f}% success")

def main():
    """Generate all plots and statistics."""
    print("Loading benchmark results...")
    df = load_data()

    print(f"\nLoaded {len(df)} trials")
    print(f"Testing {df['N'].nunique()} unique numbers")
    print(f"Strategies: {df['strategy'].unique()}")

    print("\nGenerating plots...")
    plot_success_vs_n(df)
    plot_success_vs_phi_divisors(df)
    plot_time_vs_n(df)
    plot_success_by_range(df)

    generate_summary_stats(df)

    print("\n" + "="*60)
    print("COMPLETE - Ready for paper")
    print("="*60)
    print("\nNext steps:")
    print("  1. Review plots/ directory")
    print("  2. Write paper sections with these figures")
    print("  3. Add random strategy comparison (when implemented)")

if __name__ == '__main__':
    main()
